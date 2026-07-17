# ArthaSmart — IoT

Firmware for the two ESP32-based peripherals that feed ArthaSmart:

| Folder                                  | Board             | Role                                           |
| --------------------------------------- | ----------------- | ---------------------------------------------- |
| [`nfc-logger/`](./nfc-logger/)          | ESP32 + RC522     | Tap a registered NFC tag → logs an expense.    |
| [`receipt-scanner/`](./receipt-scanner/)| ESP32-CAM         | Press shutter → uploads a JPEG as a receipt.   |

Both talk to the ArthaSmart backend over **HTTPS only**. No MQTT, no
broker — the API is the only contract.

---

## Architecture at a glance

```
+---------------------+        HTTPS         +---------------------+
|  NFC Logger (ESP32) | -------------------> |                     |
+---------------------+  POST /ingest/       |   ArthaSmart        |
                         nfc-tap/            |   Django backend    |
+---------------------+  POST /ingest/       |                     |
| Receipt Scanner     | -------------------> |   (OCR pipeline     |
| (ESP32-CAM)         |  receipt/            |    picks up         |
+---------------------+                      |    pending images)  |
                                             +---------------------+
```

The backend endpoints live in `backend/apps/iot/`:

- `POST /api/v1/iot/pair/request/`  — anonymous, returns a 6-digit code
- `POST /api/v1/iot/pair/claim/`    — authenticated user claims the code
- `GET  /api/v1/iot/pair/status/<code>/`  — device polls for its api_key
- `POST /api/v1/iot/ingest/receipt/`       — device uploads JPEG
- `POST /api/v1/iot/ingest/nfc-tap/`       — device reports a tag tap

Device auth uses a per-device `X-Device-API-Key` header plus an optional
`X-Device-Timestamp` to blunt replay attacks. See
`backend/apps/iot/authentication.py`.

---

## Pairing flow (Option B: user types the code)

```
 device                           backend                        user
 ------                           -------                        ----
   | POST /pair/request/             |                              |
   | hardware_id + device_type       |                              |
   |-------------------------------->|                              |
   |   201  { pairing_code: 493201, expires_in: 600 }               |
   |<--------------------------------|                              |
   |                                 |                              |
 shows "493201"                      |                              |
 on serial monitor                   |    opens web app             |
                                     |                              |
                                     |  POST /pair/claim/  (JWT)    |
                                     |<-----------------------------|
                                     |    200  { api_key, ... }     |
                                     |----------------------------->|
   | GET /pair/status/493201/        |                              |
   |-------------------------------->|                              |
   |   200  { status: paired, api_key: "ask_iot_..." }              |
   |<--------------------------------|                              |
 writes api_key                      |                              |
 to NVS                              |                              |
                                     |                              |
   | GET /pair/status/493201/   (anyone who guesses the code)       |
   |-------------------------------->|                              |
   |   410  { status: already_consumed }                            |
   |<--------------------------------|                              |
```

The api_key is delivered exactly once. A second poll returns 410; the code
cannot leak via a replay.

---

## Network setup (dev)

The firmware is hardcoded to talk to your Django backend over HTTPS at a
LAN address. For the prototype we use a self-signed cert and
`client.setInsecure()` on the ESP32 — no cert pinning.

On the backend machine:

```bash
# From backend/
pip install django-extensions Werkzeug pyOpenSSL
python manage.py runserver_plus --cert-file /tmp/dev-cert.pem 0.0.0.0:8443
```

Put that machine's LAN IP into each device's `include/config.h` as
`BACKEND_BASE_URL` — e.g. `https://192.168.1.42:8443`.

---

## Removing IoT later

IoT lives in its own district of the codebase. If you ever cut the feature:

- Delete `backend/apps/iot/` and drop its entry from `INSTALLED_APPS` + the
  URL include.
- Delete this `iot/` folder.
- The `Receipt.source_device` FK and the `Expense.source = "nfc"` string
  stop being written — nothing else changes.

No other Django app imports from `apps.iot`, so nothing else breaks.

---

## Per-device docs

- [`nfc-logger/README.md`](./nfc-logger/README.md) — wiring, flashing,
  troubleshooting for the NFC device.
- [`receipt-scanner/README.md`](./receipt-scanner/README.md) — same, for
  the ESP32-CAM.
