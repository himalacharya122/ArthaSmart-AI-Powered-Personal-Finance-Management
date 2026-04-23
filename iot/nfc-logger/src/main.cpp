// ArthaSmart, NFC Logger firmware
//
// Boot flow:
//   1. Load WiFi + backend config from include/config.h.
//   2. Look up `api_key` in NVS (non-volatile storage on the ESP32).
//      - Missing key? Run the pairing handshake once:
//          POST /iot/pair/request/         -> 6-digit code
//          (user types code into the web app)
//          GET  /iot/pair/status/<code>/   -> api_key (polled every 3s)
//        On success, persist api_key to NVS and continue.
//   3. Main loop:
//          RC522 waits for a card.
//          Tag UID -> POST /iot/ingest/nfc-tap/  (JSON + device headers).
//          201 -> short happy beep.
//          404 -> long sad beep ("tag not registered, open web app").
//          anything else -> triple error beep.
//
// This firmware stays intentionally dumb. No offline queueing, no retries
// with backoff - if the network is down the user just taps again later.
// The backend is the source of truth; the device is a UX peripheral.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>   // ESP32 NVS wrapper
#include <SPI.h>
#include <MFRC522.h>
#include <ArduinoJson.h>

#include "config.h"

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

static MFRC522       rfid(PIN_RC522_SS, PIN_RC522_RST);
static Preferences   prefs;          // NVS namespace "artha"
static String        apiKey;         // populated on boot (NVS or pairing)

// Debounce: if the same card stays on the reader, don't spam the backend.
static String        lastUid;
static unsigned long lastUidAtMs = 0;
static const unsigned long UID_DEBOUNCE_MS = 2000;

// ---------------------------------------------------------------------------
// Feedback helpers — LED blinks + buzzer beeps
// ---------------------------------------------------------------------------

static void beep(int durationMs) {
    digitalWrite(PIN_BUZZER, HIGH);
    digitalWrite(PIN_LED_STATUS, HIGH);
    delay(durationMs);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED_STATUS, LOW);
}

static void beepOk()     { beep(120); }                         // one short
static void beepSad()    { beep(600); }                         // one long
static void beepError()  { for (int i = 0; i < 3; i++) { beep(80); delay(80); } }
static void beepPairing(){ beep(50); delay(150); beep(50); delay(150); beep(50); }

// ---------------------------------------------------------------------------
// WiFi
// ---------------------------------------------------------------------------

static void connectWifi() {
    Serial.printf("[wifi] connecting to %s ...\n", WIFI_SSID);
    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

    unsigned long start = millis();
    while (WiFi.status() != WL_CONNECTED) {
        delay(250);
        Serial.print('.');
        // 30s hard cap — something is wrong if we can't associate by then.
        if (millis() - start > 30000) {
            Serial.println("\n[wifi] giving up, rebooting");
            ESP.restart();
        }
    }
    Serial.printf("\n[wifi] ok, ip=%s\n", WiFi.localIP().toString().c_str());
}

// ---------------------------------------------------------------------------
// HTTPS helper
// ---------------------------------------------------------------------------
//
// Every call goes through this so we only configure the TLS client in one
// place. Self-signed dev cert -> setInsecure(). For production you'd pin a
// CA bundle via client.setCACert(...).

static int httpSend(
    const char* method,
    const String& path,
    const String& body,
    String& outBody,
    bool withDeviceAuth
) {
    WiFiClientSecure client;
    client.setInsecure();

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + path;
    if (!http.begin(client, url)) {
        Serial.printf("[http] begin failed for %s\n", url.c_str());
        return -1;
    }
    http.addHeader("Content-Type", "application/json");
    if (withDeviceAuth && apiKey.length()) {
        http.addHeader("X-Device-API-Key", apiKey);
        // Timestamp header lets the backend reject replayed requests.
        // Unit is milliseconds since epoch; drift window is 60s server-side.
        http.addHeader("X-Device-Timestamp", String((uint64_t)time(nullptr) * 1000ULL));
    }

    int code;
    if (strcmp(method, "POST") == 0) {
        code = http.POST(body);
    } else {
        code = http.GET();
    }
    outBody = http.getString();
    http.end();
    return code;
}

// ---------------------------------------------------------------------------
// Pairing handshake
// ---------------------------------------------------------------------------

static String requestPairingCode() {
    StaticJsonDocument<192> doc;
    doc["hardware_id"]  = HARDWARE_ID;
    doc["device_type"]  = "nfc_logger";
    String body;
    serializeJson(doc, body);

    String resp;
    int status = httpSend("POST", "/api/v1/iot/pair/request/", body, resp, false);
    if (status != 201) {
        Serial.printf("[pair] request failed: http=%d body=%s\n", status, resp.c_str());
        return "";
    }

    StaticJsonDocument<256> out;
    if (deserializeJson(out, resp)) {
        Serial.println("[pair] response JSON parse failed");
        return "";
    }
    return String((const char*)out["pairing_code"]);
}

static String pollForApiKey(const String& code) {
    // Up to PAIRING_TTL on the backend (10 min). Poll every 3s.
    for (int i = 0; i < 200; i++) {
        String resp;
        int status = httpSend("GET", "/api/v1/iot/pair/status/" + code + "/", "", resp, false);

        if (status == 200) {
            StaticJsonDocument<256> out;
            if (deserializeJson(out, resp) == DeserializationError::Ok &&
                String((const char*)out["status"]) == "paired") {
                return String((const char*)out["api_key"]);
            }
        } else if (status == 410) {
            Serial.println("[pair] code expired or already consumed, restarting");
            return "";
        }

        beepPairing();
        delay(3000);
    }
    return "";
}

static void runPairing() {
    Serial.println("[pair] no api_key in NVS — starting pairing flow");
    String code = requestPairingCode();
    if (code.isEmpty()) {
        delay(5000);
        ESP.restart();
    }

    // The user needs to see this code. In a richer build this'd be an OLED;
    // for now, the serial monitor is the "display".
    Serial.println("============================================");
    Serial.printf ("  PAIRING CODE:   %s\n", code.c_str());
    Serial.println("  Type this into the ArthaSmart web app.");
    Serial.println("============================================");

    String key = pollForApiKey(code);
    if (key.isEmpty()) {
        Serial.println("[pair] failed, rebooting");
        delay(2000);
        ESP.restart();
    }

    prefs.putString("api_key", key);
    apiKey = key;
    Serial.println("[pair] paired — api_key saved to NVS");
    // Long happy triple-beep so the user knows it worked without looking.
    beepOk(); delay(120); beepOk(); delay(120); beepOk();
}

// ---------------------------------------------------------------------------
// Ingestion — send a tap
// ---------------------------------------------------------------------------

static void sendTap(const String& uid) {
    StaticJsonDocument<128> doc;
    doc["tag_uid"] = uid;
    String body;
    serializeJson(doc, body);

    String resp;
    int status = httpSend("POST", "/api/v1/iot/ingest/nfc-tap/", body, resp, true);
    Serial.printf("[tap] uid=%s -> http=%d\n", uid.c_str(), status);

    if (status == 201) {
        beepOk();
    } else if (status == 404) {
        // Unknown/inactive tag — user hasn't configured it yet.
        beepSad();
    } else if (status == 401) {
        // Key invalidated server-side. Nuke NVS and re-pair next boot.
        Serial.println("[tap] api_key rejected, clearing NVS");
        prefs.remove("api_key");
        beepError();
        delay(1000);
        ESP.restart();
    } else {
        beepError();
    }
}

// ---------------------------------------------------------------------------
// Card reading
// ---------------------------------------------------------------------------

static String uidToString(const MFRC522::Uid& u) {
    String s;
    for (byte i = 0; i < u.size; i++) {
        if (u.uidByte[i] < 0x10) s += '0';
        s += String(u.uidByte[i], HEX);
        if (i + 1 < u.size) s += ':';
    }
    s.toUpperCase();
    return s;
}

// ---------------------------------------------------------------------------
// Arduino entrypoints
// ---------------------------------------------------------------------------

void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n[boot] ArthaSmart NFC Logger");

    pinMode(PIN_BUZZER, OUTPUT);
    pinMode(PIN_LED_STATUS, OUTPUT);
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_LED_STATUS, LOW);

    SPI.begin();
    rfid.PCD_Init();
    Serial.println("[rc522] init ok");

    connectWifi();

    prefs.begin("artha", false);   // RW
    apiKey = prefs.getString("api_key", "");
    if (apiKey.isEmpty()) {
        runPairing();
    } else {
        Serial.println("[boot] api_key loaded from NVS");
        beepOk();
    }
}

void loop() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
        delay(50);
        return;
    }

    String uid = uidToString(rfid.uid);
    unsigned long now = millis();
    bool isRepeat = (uid == lastUid) && (now - lastUidAtMs < UID_DEBOUNCE_MS);
    lastUid = uid;
    lastUidAtMs = now;

    if (!isRepeat) {
        sendTap(uid);
    }

    rfid.PICC_HaltA();
    rfid.PCD_StopCrypto1();
}
