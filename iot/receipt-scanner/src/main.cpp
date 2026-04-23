// ArthaSmart — Receipt Scanner firmware (ESP32-CAM)
//
// Boot flow mirrors the NFC logger:
//   1. WiFi up.
//   2. Load api_key from NVS, or run the pairing handshake.
//   3. Main loop: wait for shutter button. On press:
//          flash LED on -> capture JPEG -> flash LED off
//          multipart POST /api/v1/iot/ingest/receipt/ with image=<jpeg>
//          201 -> double blink OK; anything else -> slow blink error.
//
// The backend stores the JPEG as Receipt(status="pending") and the existing
// OCR pipeline picks it up. The ESP32 never waits for OCR.

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <ArduinoJson.h>

#include "esp_camera.h"
#include "config.h"

// ---------------------------------------------------------------------------
// AI-Thinker ESP32-CAM pin map - don't touch unless you know your board.
// ---------------------------------------------------------------------------
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

static Preferences prefs;
static String      apiKey;

// ---------------------------------------------------------------------------
// LED feedback
// ---------------------------------------------------------------------------

static void blink(int times, int onMs, int offMs) {
    for (int i = 0; i < times; i++) {
        digitalWrite(PIN_FLASH_LED, HIGH);
        delay(onMs);
        digitalWrite(PIN_FLASH_LED, LOW);
        if (i + 1 < times) delay(offMs);
    }
}
static void blinkOk()    { blink(2, 120, 120); }
static void blinkError() { blink(5, 300, 200); }

// ---------------------------------------------------------------------------
// Camera
// ---------------------------------------------------------------------------

static bool cameraInit() {
    camera_config_t c = {};
    c.ledc_channel = LEDC_CHANNEL_0;
    c.ledc_timer   = LEDC_TIMER_0;
    c.pin_d0 = Y2_GPIO_NUM;   c.pin_d1 = Y3_GPIO_NUM;
    c.pin_d2 = Y4_GPIO_NUM;   c.pin_d3 = Y5_GPIO_NUM;
    c.pin_d4 = Y6_GPIO_NUM;   c.pin_d5 = Y7_GPIO_NUM;
    c.pin_d6 = Y8_GPIO_NUM;   c.pin_d7 = Y9_GPIO_NUM;
    c.pin_xclk = XCLK_GPIO_NUM;
    c.pin_pclk = PCLK_GPIO_NUM;
    c.pin_vsync = VSYNC_GPIO_NUM;
    c.pin_href  = HREF_GPIO_NUM;
    c.pin_sccb_sda = SIOD_GPIO_NUM;
    c.pin_sccb_scl = SIOC_GPIO_NUM;
    c.pin_pwdn     = PWDN_GPIO_NUM;
    c.pin_reset    = RESET_GPIO_NUM;
    c.xclk_freq_hz = 20000000;
    c.pixel_format = PIXFORMAT_JPEG;
    c.frame_size   = CAPTURE_FRAMESIZE;
    c.jpeg_quality = CAPTURE_JPEG_QUALITY;
    c.fb_count     = 2;      // double-buffer — smoother captures
    c.fb_location  = CAMERA_FB_IN_PSRAM;
    c.grab_mode    = CAMERA_GRAB_LATEST;

    esp_err_t err = esp_camera_init(&c);
    if (err != ESP_OK) {
        Serial.printf("[cam] init failed: 0x%x\n", err);
        return false;
    }
    return true;
}

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
        if (millis() - start > 30000) {
            Serial.println("\n[wifi] giving up, rebooting");
            ESP.restart();
        }
    }
    Serial.printf("\n[wifi] ok, ip=%s\n", WiFi.localIP().toString().c_str());
}

// ---------------------------------------------------------------------------
// HTTPS helpers - one for JSON (pairing), one for multipart (upload)
// ---------------------------------------------------------------------------

static int httpJson(
    const char* method, const String& path,
    const String& body, String& outBody, bool withAuth
) {
    WiFiClientSecure client;
    client.setInsecure();
    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + path;
    if (!http.begin(client, url)) return -1;
    http.addHeader("Content-Type", "application/json");
    if (withAuth && apiKey.length()) {
        http.addHeader("X-Device-API-Key", apiKey);
        http.addHeader("X-Device-Timestamp", String((uint64_t)time(nullptr) * 1000ULL));
    }
    int code = (strcmp(method, "POST") == 0) ? http.POST(body) : http.GET();
    outBody = http.getString();
    http.end();
    return code;
}

// Tiny URL parser helpers - avoid pulling in a full URL lib.
static String _hostFromUrl() {
    String u = BACKEND_BASE_URL;
    int slash = u.indexOf("//");
    int start = (slash >= 0) ? slash + 2 : 0;
    int colon = u.indexOf(':', start);
    int end   = (colon > 0) ? colon : u.length();
    return u.substring(start, end);
}
static int _portFromUrl() {
    String u = BACKEND_BASE_URL;
    int slash = u.indexOf("//");
    int start = (slash >= 0) ? slash + 2 : 0;
    int colon = u.indexOf(':', start);
    if (colon < 0) return 443;       // https default
    return u.substring(colon + 1).toInt();
}

// Multipart JPEG POST. We stream the framebuffer into the request body
// manually - HTTPClient's addFile API doesn't play nice with PSRAM buffers.
static int uploadJpeg(camera_fb_t* fb) {
    WiFiClientSecure client;
    client.setInsecure();
    if (!client.connect(_hostFromUrl().c_str(), _portFromUrl())) {
        Serial.println("[upload] TLS connect failed");
        return -1;
    }

    const String boundary = "----ArthaSmartBoundary7f3Bc0";
    String head =
        "--" + boundary + "\r\n"
        "Content-Disposition: form-data; name=\"image\"; filename=\"receipt.jpg\"\r\n"
        "Content-Type: image/jpeg\r\n\r\n";
    String tail = "\r\n--" + boundary + "--\r\n";

    size_t contentLength = head.length() + fb->len + tail.length();

    // Request line + headers
    client.printf("POST /api/v1/iot/ingest/receipt/ HTTP/1.1\r\n");
    client.printf("Host: %s\r\n", _hostFromUrl().c_str());
    client.printf("X-Device-API-Key: %s\r\n", apiKey.c_str());
    client.printf("X-Device-Timestamp: %llu\r\n", (uint64_t)time(nullptr) * 1000ULL);
    client.printf("Content-Type: multipart/form-data; boundary=%s\r\n", boundary.c_str());
    client.printf("Content-Length: %u\r\n", (unsigned)contentLength);
    client.print("Connection: close\r\n\r\n");

    client.print(head);
    // Send the JPEG in chunks so we don't OOM.
    const size_t CHUNK = 1024;
    size_t sent = 0;
    while (sent < fb->len) {
        size_t n = min(CHUNK, fb->len - sent);
        client.write(fb->buf + sent, n);
        sent += n;
    }
    client.print(tail);

    // Parse just enough of the response to pull the status code.
    String statusLine = client.readStringUntil('\n');
    int sp1 = statusLine.indexOf(' ');
    int sp2 = statusLine.indexOf(' ', sp1 + 1);
    int code = (sp1 > 0 && sp2 > sp1) ? statusLine.substring(sp1 + 1, sp2).toInt() : -1;
    // Drain the rest so the server-side close is clean.
    while (client.connected() && client.available()) client.read();
    client.stop();
    return code;
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

static String requestPairingCode() {
    StaticJsonDocument<192> doc;
    doc["hardware_id"] = HARDWARE_ID;
    doc["device_type"] = "receipt_scanner";
    String body; serializeJson(doc, body);

    String resp;
    int status = httpJson("POST", "/api/v1/iot/pair/request/", body, resp, false);
    if (status != 201) {
        Serial.printf("[pair] request failed: http=%d\n", status);
        return "";
    }
    StaticJsonDocument<256> out;
    if (deserializeJson(out, resp)) return "";
    return String((const char*)out["pairing_code"]);
}

static String pollForApiKey(const String& code) {
    for (int i = 0; i < 200; i++) {   // ~10 min at 3s cadence
        String resp;
        int status = httpJson("GET", "/api/v1/iot/pair/status/" + code + "/", "", resp, false);
        if (status == 200) {
            StaticJsonDocument<256> out;
            if (deserializeJson(out, resp) == DeserializationError::Ok &&
                String((const char*)out["status"]) == "paired") {
                return String((const char*)out["api_key"]);
            }
        } else if (status == 410) {
            return "";
        }
        blink(1, 40, 0);
        delay(3000);
    }
    return "";
}

static void runPairing() {
    Serial.println("[pair] no api_key in NVS — pairing");
    String code = requestPairingCode();
    if (code.isEmpty()) { delay(5000); ESP.restart(); }
    Serial.println("============================================");
    Serial.printf ("  PAIRING CODE:   %s\n", code.c_str());
    Serial.println("  Enter this in the ArthaSmart web app.");
    Serial.println("============================================");
    String key = pollForApiKey(code);
    if (key.isEmpty()) { Serial.println("[pair] failed"); delay(2000); ESP.restart(); }
    prefs.putString("api_key", key);
    apiKey = key;
    Serial.println("[pair] paired — saved to NVS");
    blinkOk();
}

// ---------------------------------------------------------------------------
// Capture + send
// ---------------------------------------------------------------------------

static void captureAndSend() {
    // Flash on, grab a frame, flash off. Two discards before the keeper —
    // the sensor's auto-exposure needs a beat to settle when the LED fires.
    digitalWrite(PIN_FLASH_LED, HIGH);
    delay(80);
    esp_camera_fb_return(esp_camera_fb_get());
    esp_camera_fb_return(esp_camera_fb_get());
    camera_fb_t* fb = esp_camera_fb_get();
    digitalWrite(PIN_FLASH_LED, LOW);

    if (!fb) {
        Serial.println("[cap] frame grab failed");
        blinkError();
        return;
    }
    Serial.printf("[cap] %u bytes, %dx%d\n", (unsigned)fb->len, fb->width, fb->height);

    int status = uploadJpeg(fb);
    esp_camera_fb_return(fb);

    Serial.printf("[upload] http=%d\n", status);
    if (status == 201) {
        blinkOk();
    } else if (status == 401) {
        Serial.println("[upload] api_key rejected, clearing NVS");
        prefs.remove("api_key");
        blinkError();
        delay(500);
        ESP.restart();
    } else {
        blinkError();
    }
}

// ---------------------------------------------------------------------------
// Arduino entrypoints
// ---------------------------------------------------------------------------

void setup() {
    Serial.begin(115200);
    delay(200);
    Serial.println("\n[boot] ArthaSmart Receipt Scanner");

    pinMode(PIN_FLASH_LED, OUTPUT);
    digitalWrite(PIN_FLASH_LED, LOW);
    pinMode(PIN_SHUTTER, INPUT_PULLUP);   // button to GND

    if (!cameraInit()) {
        blinkError();
        delay(2000);
        ESP.restart();
    }
    connectWifi();

    prefs.begin("artha", false);
    apiKey = prefs.getString("api_key", "");
    if (apiKey.isEmpty()) runPairing();
    else Serial.println("[boot] api_key loaded from NVS");

    blinkOk();   // ready
}

void loop() {
    // Active-low momentary shutter. Debounce: require 40 ms of steady low,
    // then wait for release before arming again.
    if (digitalRead(PIN_SHUTTER) == LOW) {
        delay(40);
        if (digitalRead(PIN_SHUTTER) == LOW) {
            Serial.println("[btn] shutter");
            captureAndSend();
            while (digitalRead(PIN_SHUTTER) == LOW) delay(10);
        }
    }
    delay(20);
}
