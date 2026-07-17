// ArthaSmart — NFC Logger firmware (ESP32 + PN532 over I2C)
//
// Boot flow:
//   1. Load WiFi + backend config from include/config.h.
//   2. Bring up WiFi and (best-effort) NTP so replay timestamps work.
//   3. Look up `api_key` in NVS (non-volatile storage on the ESP32).
//      - Missing key? Run the pairing handshake once:
//          POST /iot/pair/request/         -> 6-digit code
//          (user types code into the web app)
//          GET  /iot/pair/status/<code>/   -> api_key (polled every 3s)
//        On success, persist api_key to NVS and continue.
//   4. Main loop:
//          PN532 waits for a MIFARE/ISO14443A card.
//          Tag UID -> POST /iot/ingest/nfc-tap/  (JSON + device headers).
//          201 -> short happy beep.
//          404 -> long sad beep ("tag not registered, open web app").
//          anything else -> triple error beep.
//
// Hardware swap note: the original scaffold used an RC522 over SPI. This
// file is the PN532-over-I2C rewrite — matches the Adafruit_PN532 sketch
// the user got working. Wiring is now just SDA/SCL + 3V3/GND.
//
// This firmware stays intentionally dumb. No offline queueing, no retries
// with backoff — if the network is down the user just taps again later.
// The backend is the source of truth; the device is a UX peripheral.

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <Preferences.h>   // ESP32 NVS wrapper
#include <Wire.h>
#include <Adafruit_PN532.h>
#include <ArduinoJson.h>
#include <time.h>

#include "config.h"

// Pull in the right TLS client based on the config toggle. Keeping both
// paths behind an #if means a plain-HTTP dev run doesn't pay the RAM cost
// of mbedTLS.
#if BACKEND_USE_HTTPS
  #include <WiFiClientSecure.h>
#else
  #include <WiFiClient.h>
#endif

// ---------------------------------------------------------------------------
// Globals
// ---------------------------------------------------------------------------

// (-1, -1) tells Adafruit_PN532 "I2C mode, no IRQ/RESET pins wired up".
// Works exactly like the sanity sketch the user flashed.
static Adafruit_PN532 nfc(-1, -1);
static Preferences    prefs;          // NVS namespace "artha"
static String         apiKey;         // populated on boot (NVS or pairing)

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
// WiFi + NTP
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

// Best-effort NTP. If this fails we still run — the X-Device-Timestamp header
// is optional on the backend (60s drift window, but missing is allowed).
static bool ntpSynced = false;
static void syncTime() {
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    unsigned long start = millis();
    while (millis() - start < 5000) {
        if (time(nullptr) > 1700000000) {   // sane epoch -> past 2023
            ntpSynced = true;
            Serial.println("[ntp] synced");
            return;
        }
        delay(200);
    }
    Serial.println("[ntp] sync timeout, continuing without timestamps");
}

// ---------------------------------------------------------------------------
// HTTPS / HTTP helper
// ---------------------------------------------------------------------------
//
// Every call goes through this so we configure the TLS client in one place.
// Self-signed dev cert -> setInsecure(). For production you'd pin a CA
// bundle via client.setCACert(...).

static int httpSend(
    const char* method,
    const String& path,
    const String& body,
    String& outBody,
    bool withDeviceAuth
) {
#if BACKEND_USE_HTTPS
    WiFiClientSecure client;
    client.setInsecure();
#else
    WiFiClient client;
#endif

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + path;
    if (!http.begin(client, url)) {
        Serial.printf("[http] begin failed for %s\n", url.c_str());
        return -1;
    }
    http.addHeader("Content-Type", "application/json");
    if (withDeviceAuth && apiKey.length()) {
        http.addHeader("X-Device-API-Key", apiKey);
        // Timestamp is only meaningful if NTP actually synced. Sending an
        // obviously-wrong value (e.g. seconds-since-boot) would hit the
        // 60s drift guard and get us 401'd.
        if (ntpSynced) {
            http.addHeader(
                "X-Device-Timestamp",
                String((uint64_t)time(nullptr) * 1000ULL)
            );
        }
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
    // Triple-beep so the user knows it worked without looking at serial.
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

static String formatUid(const uint8_t* bytes, uint8_t len) {
    String s;
    for (uint8_t i = 0; i < len; i++) {
        if (bytes[i] < 0x10) s += '0';
        s += String(bytes[i], HEX);
        if (i + 1 < len) s += ':';
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

    // I2C bus for the PN532. Pins come from config.h (default 21/22).
    //
    // Explicit 100kHz clock: the ESP32 WiFi driver shares the same CPU
    // core and can preempt I2C transactions. At the default fast rate
    // the PN532 sometimes NACKs under WiFi load (seen as Wire error 263).
    // 100kHz is the "safe" standard-mode speed and is plenty for tap
    // detection.
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    Wire.setClock(100000);

    nfc.begin();
    uint32_t version = nfc.getFirmwareVersion();
    if (!version) {
        Serial.println("[pn532] NOT FOUND — check wiring, DIP switches, and I2C pull-ups");
        // Blink forever so the user sees something is wrong.
        while (true) {
            beepError();
            delay(2000);
        }
    }
    Serial.printf("[pn532] detected, fw=0x%02X\n", (version >> 16) & 0xFF);
    nfc.SAMConfig();   // required before readPassiveTargetID

    connectWifi();
    syncTime();

    prefs.begin("artha", false);   // RW
    apiKey = prefs.getString("api_key", "");
    if (apiKey.isEmpty()) {
        runPairing();
    } else {
        Serial.println("[boot] api_key loaded from NVS");
        beepOk();
    }
    Serial.println("[boot] ready — tap a card");
}

void loop() {
    uint8_t uid[7] = {0};
    uint8_t uidLen = 0;

    // Short 100ms passive-read window. Keeping the blocking I2C transaction
    // brief means WiFi/FreeRTOS tasks aren't starved — the default 500ms
    // window was long enough for the WiFi driver to preempt mid-read and
    // trigger `i2cRead Error 263`. We just loop faster instead.
    bool found = nfc.readPassiveTargetID(
        PN532_MIFARE_ISO14443A, uid, &uidLen, 100
    );

    // Yield to other FreeRTOS tasks (WiFi, lwIP) every iteration. Without
    // this the tight readPassiveTargetID loop can wedge I2C while the WiFi
    // stack tries to service packets on the same core.
    delay(20);

    if (!found) return;

    String uidStr = formatUid(uid, uidLen);
    unsigned long now = millis();
    bool isRepeat = (uidStr == lastUid) && (now - lastUidAtMs < UID_DEBOUNCE_MS);
    lastUid = uidStr;
    lastUidAtMs = now;

    if (isRepeat) {
        // Still-on-the-reader repeat scan — silent skip.
        return;
    }

    Serial.printf("[nfc] tap uid=%s\n", uidStr.c_str());
    sendTap(uidStr);
}
