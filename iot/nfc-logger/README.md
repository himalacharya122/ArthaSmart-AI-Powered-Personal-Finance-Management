# ArthaSmart — NFC Logger Firmware

ESP32 + **PN532 red board in I²C mode**. Tap a registered tag → an expense
lands in ArthaSmart using the tag's saved defaults (amount, category,
merchant).

> For the **end-to-end testing walkthrough** (backend up, pair device,
> register tag, tap) see [`docs/iot/TESTING.md`](../../docs/iot/TESTING.md).

---

## Hardware

| Part               | Notes                                               |
| ------------------ | --------------------------------------------------- |
| ESP32 DevKit       | Any ESP32-WROOM-32 dev board.                       |
| PN532 red board    | "Elechouse v3" style. **I²C mode** (DIP switches).  |
| Passive buzzer     | 5 V piezo, + leg to GPIO 25, − leg to GND.          |
| Status LED         | Onboard LED on GPIO 2 is used by default.           |
| 4 dupont wires     | VCC, GND, SDA, SCL between the two boards.          |

### DIP switches on the PN532

The red board has two small switches for choosing the interface. For this
firmware you want **I²C**:

```
          SEL0 = ON
          SEL1 = OFF
```

(Silkscreens differ across clones. If I²C doesn't work try the opposite
pattern — the sanity sketch's `nfc.getFirmwareVersion()` is a cheap way to
check.)

### Wiring (matches your working sketch)

```
PN532          ESP32
-----          -----
VCC    <--->   3V3        (NEVER 5V)
GND    <--->   GND
SDA    <--->   GPIO 21
SCL    <--->   GPIO 22

Buzzer +       GPIO 25
Buzzer −       GND
```

Photo reference: `docs/iot/iot_images/nfc_wiring_1.jpeg` and `nfc_wiring_2.jpeg`.

Pins are declared in `include/config.h` — change them there, not in
`src/main.cpp`, if your wiring differs.

---

## First-time setup

1. Install the PlatformIO VS Code extension.
2. Copy the config template and edit it:
   ```bash
   cp include/config.h.example include/config.h
   ```
   Fill in:
   - `WIFI_SSID`, `WIFI_PASSWORD` — your home WiFi (2.4 GHz).
   - `BACKEND_BASE_URL` — e.g. `http://192.168.1.42:8000` (see
     `docs/iot/TESTING.md` for how to find this).
   - `BACKEND_USE_HTTPS` — leave `0` for first test, flip to `1` later.
   - `HARDWARE_ID` — any stable string unique to this board.
3. Plug the ESP32 in over USB. Check Device Manager for the COM port.
4. In VS Code, open this folder → PlatformIO **Upload** button
   (or `pio run -t upload`).
5. Open the serial monitor at **115200 baud**.

---

## Pairing (once per device)

On first boot the device has no API key. It will:

1. Connect to WiFi, sync NTP.
2. Ask the backend for a fresh 6-digit pairing code.
3. Print:
   ```
   ============================================
     PAIRING CODE:   483201
     Type this into the ArthaSmart web app.
   ============================================
   ```
4. Beep softly every 3 s while polling for the claim.

Open the web app → **IoT Devices → Pair a Device**, enter the code, name
the device. The ESP32 picks up its `api_key`, writes it to NVS, triple-beeps
OK, and enters the tap loop. The key survives reboots — you never pair
this device again unless you wipe NVS (`pio run -t erase`).

---

## Tap feedback

| Event                         | Buzzer        |
| ----------------------------- | ------------- |
| Tap accepted (expense logged) | Short beep    |
| Tag unknown / inactive (404)  | Long sad beep |
| Network / server error        | 3 quick beeps |
| API key rejected (401)        | 3 beeps + NVS wipe + reboot (re-pair) |
| PN532 not detected on boot    | Continuous error beeps (fix wiring) |

The onboard LED mirrors the buzzer for silent environments.

---

## Troubleshooting

**`[pn532] NOT FOUND`** — double-check the four wires, 3V3 (not 5V), and
the I²C DIP switches. A fast sanity test is to reflash the Adafruit example
sketch; if that can't see the board either, it's a hardware issue.

**`[wifi] giving up, rebooting`** — wrong SSID/password, or the network
is 5 GHz-only (ESP32 is 2.4 GHz only).

**Pairing poll returns 410** — the code expired (10-min TTL) or was
already consumed. Reboot the device to request a new one.

**Every tap returns 401** — the backend either disabled the device or
the key expired. Wipe NVS (`pio run -t erase`) and pair again.

**Tap returns 404 even though I just registered the tag** — the tag UID
the firmware sends is case-preserved upper-hex with colons (`A9:F8:31:07`);
register it in the web app in the same format.

---

## File layout

```
nfc-logger/
├── platformio.ini          Build config (board, libs, monitor speed)
├── include/
│   ├── config.h.example    Template — commit this
│   └── config.h            Your secrets — gitignored
├── src/
│   └── main.cpp            Firmware
└── README.md
```
