// ArthaSmart — Receipt Scanner firmware (ESP32-CAM, no PSRAM variant)
//
// Boot flow:
//   1. WiFi up.
//   2. Load api_key from NVS, or run the pairing handshake.
//   3. Main loop: poll backend every POLL_INTERVAL_MS for a "capture" command.
//      When the web UI clicks "Capture now":
//          backend sets pending_capture=True
//          → this firmware sees {"capture":true} on next poll
//          → flash LED on → discard 2 frames (auto-exposure settle)
//          → grab keeper frame → flash LED off
//          → POST /api/v1/iot/ingest/receipt/ (multipart JPEG)
//          → 201 → double blink OK; 401 → wipe NVS & reboot; else → error blink
//
// The backend stores the JPEG as Receipt(status="pending") and the existing
// OCR pipeline picks it up. The ESP32 never waits for OCR.
//
// Key differences from the original skeleton (do NOT revert these):
//   - CAMERA_FB_IN_DRAM  : this board has no external PSRAM
//   - fb_count = 1       : two DRAM frame buffers at VGA risks heap OOM
//   - HTTPClient for all HTTP calls (not raw WiFiClientSecure TCP sockets)
//     so plain http:// backend URLs work in development
//   - Poll-based capture trigger (no physical button required)

#include <Arduino.h>
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <WebServer.h>      // IoT Receipt Scanner: snapshot preview server
#include <Preferences.h>
#include <ArduinoJson.h>

#include "esp_camera.h"
#include "config.h"

// ---------------------------------------------------------------------------
// AI-Thinker ESP32-CAM pin map — do not touch
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
// IoT Receipt Scanner — live preview HTTP server
// Serves GET /snapshot → JPEG so the web UI can show a live-ish feed before
// the user clicks "Capture". The browser fetches it directly over LAN;
// no backend proxy is involved.
//
// Port 80 on the ESP32's local IP.  The web UI gets the IP via the backend
// (PollView reads X-Device-IP from poll requests and stores it in IoTDevice).
//
// To remove: delete this server block, the handleSnapshot() function below,
// and the snapshotServer.begin() / handleClient() calls in setup() / loop().
// ---------------------------------------------------------------------------
static WebServer snapshotServer(80);

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
// IoT Receipt Scanner — snapshot handler for preview server
// Called by WebServer when the web UI hits GET http://{esp_ip}/snapshot.
// Captures a single JPEG frame and streams it back.  No warmup frames here
// (they add latency; the preview auto-refreshes every 1.5 s so the first
// couple of frames will self-correct for exposure anyway).
// To remove: delete this function and all snapshotServer.* calls.
// ---------------------------------------------------------------------------
static void handleSnapshot() {
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        snapshotServer.send(503, "text/plain", "camera busy");
        return;
    }

    // Send the JPEG directly.  We build the response manually so we can write
    // binary data — WebServer::send(code, type, String) would truncate at NUL.
    snapshotServer.sendHeader("Access-Control-Allow-Origin", "*");
    snapshotServer.sendHeader("Cache-Control", "no-cache, no-store, must-revalidate");
    snapshotServer.sendHeader("Content-Length", String(fb->len));
    snapshotServer.setContentLength(fb->len);
    snapshotServer.send(200, "image/jpeg", "");          // headers only
    WiFiClient client = snapshotServer.client();
    // Stream in 4 KB chunks so large frames don't stall the TCP stack.
    const uint8_t* p = fb->buf;
    size_t remaining = fb->len;
    while (remaining > 0) {
        size_t chunk = remaining > 4096 ? 4096 : remaining;
        client.write(p, chunk);
        p         += chunk;
        remaining -= chunk;
    }
    esp_camera_fb_return(fb);
}

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
    // No PSRAM on this board — must use internal DRAM.
    // FRAMESIZE_VGA (640x480) fits comfortably; do NOT use SXGA/UXGA here.
    c.fb_count     = 1;
    c.fb_location  = CAMERA_FB_IN_DRAM;
    // CAMERA_GRAB_LATEST requires fb_count >= 2 (double-buffer). With a single
    // DRAM buffer, use WHEN_EMPTY — grab only when the buffer is free.
    c.grab_mode    = CAMERA_GRAB_WHEN_EMPTY;

    esp_err_t err = esp_camera_init(&c);
    if (err != ESP_OK) {
        Serial.printf("[cam] init failed: 0x%x\n", err);
        return false;
    }

    // OV2640 sensor tuning for document / receipt scanning.
    // These register writes improve sharpness, contrast, and white balance
    // compared to the out-of-box defaults.  All values are writable after
    // init without restarting the camera.
    sensor_t* s = esp_camera_get_sensor();
    if (s) {
        s->set_brightness(s,  1);   // +1 brightens slightly (range -2..2)
        s->set_contrast(s,    1);   // +1 increases text/background contrast
        s->set_saturation(s,  0);   // 0 = neutral (receipts are monochrome)
        s->set_sharpness(s,   2);   // max sharpness — critical for small text
        s->set_denoise(s,     1);   // mild denoise for low-light situations
        s->set_special_effect(s, 0);// 0 = no effect (no sepia/grayscale/etc.)
        s->set_whitebal(s,    1);   // enable auto white balance
        s->set_awb_gain(s,    1);   // enable AWB gain adjustment
        s->set_wb_mode(s,     0);   // 0 = auto WB (handles fluorescent light)
        s->set_exposure_ctrl(s, 1); // enable auto exposure control (AEC)
        s->set_aec2(s,        1);   // enable AEC DSP algorithm
        s->set_ae_level(s,    0);   // AE target level: 0 = neutral
        s->set_gain_ctrl(s,   1);   // enable auto gain control (AGC)
        s->set_gainceiling(s, (gainceiling_t)2); // GAINCEILING_4X — enough for indoor
        s->set_bpc(s,         1);   // bad-pixel correction
        s->set_wpc(s,         1);   // white-pixel correction
        s->set_raw_gma(s,     1);   // raw gamma — improves dynamic range
        s->set_lenc(s,        1);   // lens shading correction (evens out vignette)
        s->set_dcw(s,         1);   // enable downsize EN
        Serial.println("[cam] sensor tuning applied");
    }
    return true;
}

// ---------------------------------------------------------------------------
// WiFi
// ---------------------------------------------------------------------------

static void connectWifi() {
    Serial.printf("[wifi] connecting to %s ...", WIFI_SSID);
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
// NTP — sync the ESP32 clock so X-Device-Timestamp passes the backend's
// 60-second drift check. Without this, time(nullptr) returns ~0 (seconds
// since 1970-01-01) and every poll gets 401 "Device clock drift too large".
// Nepal Standard Time is UTC+5:45 = 20700 seconds offset.
// ---------------------------------------------------------------------------
static void syncNtp() {
    // gmtOffset_sec=20700 (UTC+5:45), daylightOffset_sec=0 (Nepal has no DST)
    configTime(20700, 0, "pool.ntp.org", "time.google.com", "time.cloudflare.com");
    Serial.print("[ntp] syncing");
    time_t now = time(nullptr);
    for (int i = 0; i < 40 && now < 1000000000L; i++) {
        delay(250);
        Serial.print('.');
        now = time(nullptr);
    }
    if (now > 1000000000L) {
        struct tm t; gmtime_r(&now, &t);
        Serial.printf("\n[ntp] ok  %04d-%02d-%02d %02d:%02d:%02d NPT\n",
                      t.tm_year + 1900, t.tm_mon + 1, t.tm_mday,
                      t.tm_hour, t.tm_min, t.tm_sec);
    } else {
        // NTP failed (e.g., UDP blocked on college WiFi).
        // The backend's timestamp check is optional — if we omit the header
        // the check is skipped entirely. See DeviceAPIKeyAuthentication._verify_timestamp().
        Serial.println("\n[ntp] no sync — X-Device-Timestamp header will be omitted");
    }
}

// ---------------------------------------------------------------------------
// HTTP helpers — support both http:// and https:// from BACKEND_BASE_URL
// ---------------------------------------------------------------------------
// The original firmware used raw WiFiClientSecure TCP sockets, which only
// work for TLS. Since the dev backend runs on plain HTTP, all requests must
// go through HTTPClient which handles the transport selection automatically.

static bool isHttps() {
    return String(BACKEND_BASE_URL).startsWith("https");
}

// JSON GET or POST. Returns HTTP status code; -1 on connection failure.
static int httpJson(
    const char* method, const String& path,
    const String& body, String& outBody, bool withAuth
) {
    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + path;

    // HTTPClient needs a WiFiClientSecure object for HTTPS endpoints.
    WiFiClientSecure secureClient;
    if (isHttps()) {
        secureClient.setInsecure();  // self-signed certs OK in dev
        http.begin(secureClient, url);
    } else {
        http.begin(url);
    }

    http.addHeader("Content-Type", "application/json");
    if (withAuth && apiKey.length()) {
        http.addHeader("X-Device-API-Key", apiKey);
        // Only include timestamp if NTP has synced (time > year 2001).
        // The backend skips the drift check when the header is absent,
        // so omitting it is safe — it just disables replay protection.
        time_t now = time(nullptr);
        if (now > 1000000000L) {
            http.addHeader("X-Device-Timestamp", String((uint64_t)now * 1000ULL));
        }
        // IoT Receipt Scanner — report LAN IP so backend can populate last_ip.
        // The web UI uses last_ip to build the snapshot preview URL.
        // To remove: delete this addHeader line.
        http.addHeader("X-Device-IP", WiFi.localIP().toString());
    }
    http.setTimeout(10000);

    int code = (strcmp(method, "POST") == 0) ? http.POST(body) : http.GET();
    outBody = (code > 0) ? http.getString() : "";
    http.end();
    return code;
}

// Multipart JPEG POST to /api/v1/iot/ingest/receipt/.
// Builds the full multipart body in a heap buffer then POSTs it via HTTPClient.
// At VGA JPEG quality 12 the image is typically 15–40 KB; total body ~50 KB max,
// well within the ESP32's available heap after camera init.
static int uploadJpeg(camera_fb_t* fb) {
    const String boundary = "----ArthaSmartBoundary7f3Bc0";
    const String head =
        "--" + boundary + "\r\n"
        "Content-Disposition: form-data; name=\"image\"; filename=\"receipt.jpg\"\r\n"
        "Content-Type: image/jpeg\r\n\r\n";
    const String tail = "\r\n--" + boundary + "--\r\n";

    size_t totalLen = head.length() + fb->len + tail.length();
    uint8_t* buf = (uint8_t*)malloc(totalLen);
    if (!buf) {
        Serial.println("[upload] malloc failed — not enough heap");
        return -1;
    }
    memcpy(buf,                          head.c_str(), head.length());
    memcpy(buf + head.length(),          fb->buf,      fb->len);
    memcpy(buf + head.length() + fb->len, tail.c_str(), tail.length());

    HTTPClient http;
    String url = String(BACKEND_BASE_URL) + "/api/v1/iot/ingest/receipt/";

    WiFiClientSecure secureClient;
    if (isHttps()) {
        secureClient.setInsecure();
        http.begin(secureClient, url);
    } else {
        http.begin(url);
    }

    http.addHeader("X-Device-API-Key", apiKey);
    // Same NTP guard as httpJson() — omit if clock not synced.
    time_t now = time(nullptr);
    if (now > 1000000000L) {
        http.addHeader("X-Device-Timestamp", String((uint64_t)now * 1000ULL));
    }
    http.addHeader("Content-Type",
                   "multipart/form-data; boundary=" + boundary);
    http.setTimeout(15000);

    int code = http.POST(buf, totalLen);
    free(buf);
    http.end();
    return code;
}

// ---------------------------------------------------------------------------
// Pairing
// ---------------------------------------------------------------------------

static String requestPairingCode() {
    JsonDocument doc;
    doc["hardware_id"] = HARDWARE_ID;
    doc["device_type"] = "receipt_scanner";
    String body; serializeJson(doc, body);

    String resp;
    int status = httpJson("POST", "/api/v1/iot/pair/request/", body, resp, false);
    if (status != 201) {
        Serial.printf("[pair] request failed: http=%d\n", status);
        return "";
    }
    JsonDocument out;
    if (deserializeJson(out, resp)) return "";
    return String((const char*)out["pairing_code"]);
}

static String pollForApiKey(const String& code) {
    for (int i = 0; i < 200; i++) {   // ~10 min at 3 s cadence
        String resp;
        int status = httpJson("GET", "/api/v1/iot/pair/status/" + code + "/", "", resp, false);
        if (status == 200) {
            JsonDocument out;
            if (deserializeJson(out, resp) == DeserializationError::Ok &&
                String((const char*)out["status"]) == "paired") {
                return String((const char*)out["api_key"]);
            }
        } else if (status == 410) {
            return "";  // code expired
        }
        blink(1, 40, 0);  // single blink = still waiting
        delay(3000);
    }
    return "";
}

static void runPairing() {
    Serial.println("[pair] no api_key in NVS — starting pairing");
    String code = requestPairingCode();
    if (code.isEmpty()) { delay(5000); ESP.restart(); }
    Serial.println("============================================");
    Serial.printf ("  PAIRING CODE:   %s\n", code.c_str());
    Serial.println("  Enter this in the ArthaSmart web app.");
    Serial.println("  IoT Devices → Pair a Device");
    Serial.println("============================================");
    String key = pollForApiKey(code);
    if (key.isEmpty()) { Serial.println("[pair] failed or expired"); delay(2000); ESP.restart(); }
    prefs.putString("api_key", key);
    apiKey = key;
    Serial.println("[pair] paired — api_key saved to NVS");
    blinkOk();
}

// ---------------------------------------------------------------------------
// Capture + send
// ---------------------------------------------------------------------------

static void captureAndSend() {
    // Optionally enable flash (config.h: CAPTURE_USE_FLASH).
    // Default is OFF — the onboard LED overexposes at close range (< 40 cm).
    // Use ambient or desk lighting for receipt scanning.
#if CAPTURE_USE_FLASH
    digitalWrite(PIN_FLASH_LED, HIGH);
    delay(100);  // brief settle before warmup
#endif

    // Discard CAPTURE_WARMUP_FRAMES frames so the OV2640 auto-exposure can
    // converge to the current lighting before we grab the keeper shot.
    for (int i = 0; i < CAPTURE_WARMUP_FRAMES; i++) {
        camera_fb_t* dummy = esp_camera_fb_get();
        if (dummy) esp_camera_fb_return(dummy);
        delay(30);  // give the sensor time between frames
    }
    camera_fb_t* fb = esp_camera_fb_get();

#if CAPTURE_USE_FLASH
    digitalWrite(PIN_FLASH_LED, LOW);
#endif

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
        Serial.println("[upload] ok — receipt queued for OCR");
    } else if (status == 401) {
        // Backend rejected our API key. Wipe it and re-pair on next boot.
        Serial.println("[upload] 401 — api_key rejected, clearing NVS");
        prefs.remove("api_key");
        blinkError();
        delay(500);
        ESP.restart();
    } else {
        Serial.printf("[upload] unexpected status %d\n", status);
        blinkError();
    }
}

// ---------------------------------------------------------------------------
// Poll backend for "capture" command
// ---------------------------------------------------------------------------
// GET /api/v1/iot/poll/ → {"capture": true/false}
// The web UI sets the flag; this firmware checks it every POLL_INTERVAL_MS.
// Returns true if a capture was requested (so caller can fire the shutter).
//
// NOTE: This endpoint must exist on the backend before captures can be
// triggered from the web UI. See backend/apps/iot/views.py (IoTDeviceViewSet)
// and backend/apps/iot/urls.py. Until it is deployed, the poll returns 404
// and is silently ignored here — the device stays idle.

static bool checkCaptureCommand() {
    String resp;
    int status = httpJson("GET", "/api/v1/iot/poll/", "", resp, true);

    if (status == 200) {
        JsonDocument doc;
        if (!deserializeJson(doc, resp) && doc["capture"].as<bool>()) {
            return true;
        }
    } else if (status == 401) {
        // API key in NVS was rejected (revoked, rotated, or DB was wiped).
        // Wipe it so the next boot enters pairing mode and gets a fresh key.
        // Same recovery strategy as captureAndSend() on 401.
        Serial.printf("[poll] 401 auth failed: %s\n", resp.c_str());
        Serial.println("[poll] stale api_key — clearing NVS and rebooting to re-pair");
        prefs.remove("api_key");
        blinkError();
        delay(500);
        ESP.restart();
    } else if (status == 404) {
        // Poll endpoint not deployed yet — silently ignore.
    } else if (status > 0) {
        Serial.printf("[poll] unexpected status: %d\n", status);
    } else {
        Serial.printf("[poll] connection error: %d\n", status);
    }
    return false;
}

// ---------------------------------------------------------------------------
// Arduino entrypoints
// ---------------------------------------------------------------------------

void setup() {
    Serial.begin(115200);
    // 2-second pause so the serial monitor has time to connect after the
    // upload tool resets the board. Without this, the pairing code and
    // WiFi output scroll past before the terminal is ready.
    delay(2000);
    Serial.println("\n[boot] ArthaSmart Receipt Scanner");

    pinMode(PIN_FLASH_LED, OUTPUT);
    digitalWrite(PIN_FLASH_LED, LOW);

    if (!cameraInit()) {
        blinkError();
        delay(2000);
        ESP.restart();
    }
    Serial.println("[cam] init ok");

    connectWifi();
    syncNtp();

    prefs.begin("artha", false);
    apiKey = prefs.getString("api_key", "");
    if (apiKey.isEmpty()) runPairing();
    else Serial.println("[boot] api_key loaded from NVS");

    // IoT Receipt Scanner — start snapshot preview server.
    // GET http://{device_ip}/snapshot → returns a JPEG frame.
    // The web UI fetches this directly from the browser (same LAN).
    // To remove: delete these three lines and the snapshotServer.handleClient()
    // call in loop(), plus the handleSnapshot() function above.
    snapshotServer.on("/snapshot", HTTP_GET, handleSnapshot);
    snapshotServer.begin();
    Serial.printf("[preview] snapshot server on http://%s/snapshot\n",
                  WiFi.localIP().toString().c_str());

    blinkOk();  // ready indicator
    Serial.printf("[boot] polling backend every %d ms for capture commands\n", POLL_INTERVAL_MS);
}

// Track when the next backend poll should fire.
static unsigned long nextPollMs = 0;

void loop() {
    // IoT Receipt Scanner — serve snapshot requests immediately.
    // handleClient() is non-blocking (returns at once if no client is waiting).
    // Called on every loop() tick so the web UI preview feels responsive
    // even during the POLL_INTERVAL_MS wait between backend checks.
    // To remove: delete this call and snapshotServer.begin() in setup().
    snapshotServer.handleClient();

    unsigned long now = millis();
    if (now < nextPollMs) return;   // not time to poll yet — keep serving snapshots
    nextPollMs = now + POLL_INTERVAL_MS;

    // Reconnect WiFi if it dropped.
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[wifi] disconnected — reconnecting");
        connectWifi();
        return;
    }

    if (checkCaptureCommand()) {
        Serial.println("[poll] capture command — firing shutter");
        captureAndSend();
    }
}
