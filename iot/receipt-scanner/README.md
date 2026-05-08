# ArthaSmart — Receipt Scanner Firmware

ESP32-CAM (AI-Thinker) receipt scanning device. The web dashboard sends a
"Capture now" command; the ESP32 fires the shutter within 2 seconds, uploads
the JPEG to ArthaSmart, and the backend OCR pipeline processes it. The user
then reviews and confirms the OCR result in the web UI to create an expense.

> **Board note:** This firmware is written for the AI-Thinker ESP32-CAM
> **without external PSRAM**. If your board *has* PSRAM (4 MB), change
> `CAMERA_FB_IN_DRAM` → `CAMERA_FB_IN_PSRAM` and `FRAMESIZE_VGA` →
> `FRAMESIZE_SXGA` in `config.h` for higher-resolution captures.

---

## How the capture trigger works (no physical button needed)

```
Web UI  ──POST /api/v1/iot/devices/{id}/capture/──▶  Backend
                                                      sets pending_capture=True

ESP32   ──GET /api/v1/iot/poll/ every 2 s──────────▶  Backend
                                       {"capture": true} ◀─────
ESP32  fires shutter, uploads JPEG ──POST /api/v1/iot/ingest/receipt/──▶ Backend
                                                      Receipt(status="pending")
                                                      OCR pipeline picks it up
Web UI  /receipts page  ◀──  user confirms OCR result  ──▶  Expense created
```

---

## Hardware

| Part | Notes |
|------|-------|
| AI-Thinker ESP32-CAM | OV2640 sensor, onboard white flash LED (GPIO 4). No PSRAM variant is fine. |
| ESP32-CAM-MB (camera mount board) | Has a built-in USB-serial chip — no separate adapter needed. |
| 5 V power supply | The CAM needs real current. Weak USB hubs cause brownouts. |

No shutter button is required. The capture is triggered remotely from the web UI.

---

## Software prerequisites

### 1. Install PlatformIO

PlatformIO is the build system for this firmware (not Arduino IDE).

**Option A — VS Code extension (recommended)**
1. Install [VS Code](https://code.visualstudio.com/).
2. Open the Extensions panel (`Ctrl+Shift+X`).
3. Search for **PlatformIO IDE** and install it.
4. Restart VS Code. A PlatformIO icon appears in the left sidebar.

**Option B — command-line only**
```bash
pip install platformio
```
Then use `pio` commands from your terminal.

---

## Project structure

```
iot/receipt-scanner/
├── platformio.ini          ← board config, libraries, upload port
├── include/
│   ├── config.h.example    ← template — copy and fill in
│   └── config.h            ← your secrets (gitignored)
├── src/
│   └── main.cpp            ← firmware source
└── README.md
```

---

## First-time setup (step by step)

### Step 1 — Copy and fill in config.h

```bash
# From the iot/receipt-scanner/ directory:
cp include/config.h.example include/config.h
```

Open `include/config.h` and fill in:

```cpp
// Your WiFi network (same network as your backend server)
#define WIFI_SSID       "YOUR_WIFI_SSID"
#define WIFI_PASSWORD   "YOUR_WIFI_PASSWORD"

// Backend URL — use your computer's LAN IP, not localhost
// HTTP for dev, HTTPS for production
#define BACKEND_BASE_URL "http://192.168.1.XX:8000"

// Unique ID for this device (any string, shown in the web UI)
#define HARDWARE_ID      "receipt-scanner-01"
```

**How to find your computer's IP:**
- Windows: `ipconfig` in Command Prompt → look for "IPv4 Address" under your WiFi adapter
- Mac/Linux: `ifconfig` or `ip addr`
- Make sure your computer and the ESP32 are on the same WiFi network.

`config.h` is in `.gitignore` — it will never be committed.

### Step 2 — Open the project in PlatformIO

**VS Code:** File → Open Folder → select `iot/receipt-scanner/`.
PlatformIO auto-detects the `platformio.ini`.

**Command line:**
```bash
cd iot/receipt-scanner
```

### Step 3 — Flash the firmware

**If you have the ESP32-CAM-MB (the board with a USB port on the bottom):**

1. Connect the ESP32-CAM to the ESP32-CAM-MB.
2. Plug in USB.
3. In VS Code: click the **Upload** arrow (→) in the PlatformIO toolbar at the bottom.
   Or from terminal:
   ```bash
   pio run --target upload
   ```
4. If upload fails with "port not found": open `platformio.ini`, uncomment the
   `upload_port` line and set it to your COM port (e.g. `COM3` on Windows,
   `/dev/ttyUSB0` on Linux).

**If you have a bare ESP32-CAM (no MB board) — manual wiring needed:**

```
ESP32-CAM pin   USB-to-serial adapter pin
─────────────   ─────────────────────────
U0T  (TXD)  ──▶  RXD
U0R  (RXD)  ──▶  TXD
5V          ──▶  5V   (must be 5 V, not 3.3 V)
GND         ──▶  GND
IO0         ──▶  GND  (ONLY during flashing — remove after)
```

Procedure:
1. Wire as above with **IO0 bridged to GND**.
2. Press the onboard **RST** button on the ESP32-CAM.
3. Run `pio run --target upload`.
4. When upload finishes, **remove the IO0–GND wire**.
5. Press RST again to boot normally.

### Step 4 — Open the serial monitor

```bash
pio device monitor --baud 115200

# or run this to capture pairing code immidiately
pio run --target upload; pio device monitor --baud 115200
```

Or in VS Code: click the plug icon in the PlatformIO toolbar.

You will see output like:
```
[boot] ArthaSmart Receipt Scanner
[wifi] connecting to MyWiFi ......
[wifi] ok, ip=192.168.1.207
[pair] no api_key in NVS — pairing
============================================
  PAIRING CODE:   482913
  Enter this in the ArthaSmart web app.
============================================
```

### Step 5 — Pair the device in the web app

1. Open the ArthaSmart web dashboard.
2. Go to **IoT Devices → Pair a Device**.
3. Enter the 6-digit code from the serial monitor.
4. Give the device a name (e.g. "Desk Scanner").
5. Click **Pair device**.

The ESP32 will print `[pair] paired — saved to NVS` and double-blink the
flash LED. It only pairs once; the API key is stored permanently in NVS
(ESP32 non-volatile storage) and survives reboots.

---

## Daily usage — scanning a receipt

1. Position the receipt face-up under the camera (20–30 cm distance works well).
2. In the web dashboard, go to **IoT Devices → Devices tab**.
3. Find your scanner card and click **Capture now** (teal button).
4. The LED flashes → the device captures → LED blinks twice (OK).
5. Go to the **Receipts** page in the sidebar. Your receipt appears within a few
   seconds as "Pending OCR". After the OCR pipeline finishes (usually < 10 s),
   the status changes to "Completed".
6. Click **Confirm** on the card, review the extracted merchant / total / date,
   edit anything that OCR got wrong, and click **Create expense**.

---

## LED feedback

| Event | Flash LED behaviour |
|-------|---------------------|
| Boot complete / paired | 2 short blinks |
| Polling for command | Single brief blink every poll cycle |
| Capturing | Solid on during exposure (~80 ms) |
| Upload succeeded (HTTP 201) | 2 short blinks |
| Upload failed / camera error | 5 slow blinks |
| API key rejected (HTTP 401) | 5 slow blinks → reboots and re-pairs |

---

## Troubleshooting

**`Brownout detector was triggered`**
Underpowered. Use a 5 V / 1 A power supply, not a weak USB hub.

**`Camera init failed`**
Check that `CAMERA_FB_IN_DRAM` is set in config.h (not PSRAM). Also verify
all the camera pin defines match the AI-Thinker board (they are hardcoded in
main.cpp and should not need changing for the AI-Thinker).

**`[wifi] giving up, rebooting`**
Wrong SSID or password in config.h, or the ESP32 is out of WiFi range.

**`[upload] http=-1` (Connection refused)**
The backend server is not running, or `BACKEND_BASE_URL` points to the wrong IP.
Check: `ping 192.168.1.XX` from the same network. Confirm the Django server is
running (`python manage.py runserver 0.0.0.0:8000`).

**Capture button in web UI shows an error toast**
The backend `POST /api/v1/iot/devices/{id}/capture/` endpoint is not deployed
yet. This is a backend change needed in `backend/apps/iot/views.py` — add a
`capture` action to `IoTDeviceViewSet` that sets `device.pending_capture = True`,
and a `GET /api/v1/iot/poll/` endpoint that the ESP32 polls.

**Blurry receipt photos**
The OV2640 has a fixed-focus lens. Rotate the lens housing a few degrees
to refocus. A proper 20–30 cm shooting distance with the flash LED on gives
the sharpest results.

**OCR result is wrong / garbled**
OCR accuracy depends on image quality. Ensure:
- Good lighting (the flash LED helps in dim rooms)
- Receipt is flat and not crumpled
- Camera is perpendicular to the receipt, not at an angle

---

## Resetting / re-pairing

If you need to pair the device to a different account, or the API key was
rotated and the device got a 401:

The firmware automatically detects a 401 response, wipes the NVS api_key,
and reboots into pairing mode — you'll see the 6-digit code on the serial
monitor again.

To force a reset manually: in the Arduino IDE / PlatformIO serial monitor,
there is no built-in wipe command. Instead, flash a simple NVS-clear sketch,
or use `Preferences.clear()` from a temporary sketch.

---

## Configuration reference (config.h)

| Define | Default (example) | Description |
|--------|-------------------|-------------|
| `WIFI_SSID` | `"YOUR_WIFI_SSID"` | 2.4 GHz network name |
| `WIFI_PASSWORD` | `"YOUR_WIFI_PASSWORD"` | WiFi password |
| `BACKEND_BASE_URL` | `"http://192.168.1.100:8000"` | Backend root URL (no trailing slash) |
| `HARDWARE_ID` | `"receipt-scanner-01"` | Unique device identifier shown in the web UI |
| `CAPTURE_JPEG_QUALITY` | `12` | JPEG quality 1–63; lower = better quality, larger file. 10–15 is good for receipts. |
| `CAPTURE_FRAMESIZE` | `FRAMESIZE_VGA` | Resolution. VGA (640×480) fits in DRAM. SXGA (1280×1024) needs PSRAM. |
| `PIN_FLASH_LED` | `4` | Onboard white flash LED. Do not change for AI-Thinker boards. |
| `POLL_INTERVAL_MS` | `2000` | How often the ESP32 asks the backend "should I capture?" |
