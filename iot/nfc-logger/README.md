# ArthaSmart — NFC Logger Firmware

ESP32 + RC522 NFC reader. Tap a registered card → an expense lands in
ArthaSmart using the tag's saved defaults (amount, category, merchant).

---

## Hardware

| Part            | Notes                                               |
| --------------- | --------------------------------------------------- |
| ESP32-WROOM-32  | Any "ESP32 DevKit" board works.                     |
| RC522 module    | 13.56 MHz NFC reader, SPI interface.                |
| Passive buzzer  | 5 V piezo, + leg to GPIO 25, − leg to GND.          |
| LED             | The onboard LED on GPIO 2 is used by default.       |
| Dupont wires    | 7 lines between RC522 and ESP32.                    |

### Wiring

```
RC522        ESP32
-----        -----
SDA   <--->  GPIO 5      (SS / chip select)
SCK   <--->  GPIO 18     (VSPI SCK)
MOSI  <--->  GPIO 23     (VSPI MOSI)
MISO  <--->  GPIO 19     (VSPI MISO)
IRQ          (leave disconnected)
GND   <--->  GND
RST   <--->  GPIO 22
3.3V  <--->  3V3         (NEVER 5V — you will fry the module)

Buzzer +     GPIO 25
Buzzer −     GND
```

Pins are declared in `include/config.h` — change them there, not in
`src/main.cpp`, if your wiring differs.

---

## First-time setup

1. Install the PlatformIO VS Code extension.
2. Copy the config template and fill it in with your own values:
   ```bash
   cp include/config.h.example include/config.h
   ```
   Edit:
   - `WIFI_SSID`, `WIFI_PASSWORD` — your home WiFi
   - `BACKEND_BASE_URL` — e.g. `https://192.168.1.42:8443` (the LAN IP of
     the machine running `python manage.py runserver_plus --cert-file ...`)
   - `HARDWARE_ID` — any stable string unique to this board
3. Plug the ESP32 in over USB. Check `Device Manager` for the COM port.
4. In VS Code, open this folder, and click the PlatformIO **Upload** button
   (or run `pio run -t upload`).
5. Open the serial monitor at **115200 baud**.

---

## Pairing (done once per device)

On first boot the device has no API key. It will:

1. Connect to WiFi.
2. Ask the backend for a fresh pairing code.
3. Print something like:
   ```
   ============================================
     PAIRING CODE:   483201
     Type this into the ArthaSmart web app.
   ============================================
   ```
4. Beep softly every 3 s while polling for the claim.

Go to the web app → **Settings → IoT Devices → Pair a device**, enter the
code, give the device a name. The ESP32 picks up the `api_key`, writes it
to NVS, triple-beeps OK, and enters the tap loop. That api_key survives
reboots — you never pair this device again unless you wipe NVS.

---

## Tap feedback

| Event                         | Buzzer        |
| ----------------------------- | ------------- |
| Tap accepted (expense logged) | Short beep    |
| Tag unknown / inactive (404)  | Long sad beep |
| Network / server error        | 3 quick beeps |
| API key rejected (401)        | 3 beeps + NVS wipe + reboot (re-pair) |

The onboard LED mirrors the buzzer for silent environments.

---

## Troubleshooting

**`[wifi] giving up, rebooting`** — wrong SSID/password, or the network
is 5 GHz-only (ESP32 is 2.4 GHz only).

**Pairing poll returns 410** — the code expired (10-min TTL) or was
already consumed. Reboot the device to request a new one.

**Every tap returns 401** — the backend either disabled the device or
the key expired. Wipe NVS (`pio run -t erase`) and pair again.

**RC522 reads `00:00:00:00`** — bad wiring or the module isn't getting a
clean 3.3V. Move the 3V3 wire directly to the board's 3V3 pin, not
through a breadboard rail.

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
