# ArthaSmart — Receipt Scanner Firmware

AI-Thinker ESP32-CAM. Press the shutter button → the board captures a JPEG
→ uploads it to ArthaSmart as a pending receipt. The existing OCR pipeline
picks it up from there.

---

## Hardware

| Part                   | Notes                                              |
| ---------------------- | -------------------------------------------------- |
| AI-Thinker ESP32-CAM   | OV2640 sensor, 4 MB PSRAM, onboard flash LED.      |
| USB-to-serial adapter  | CP2102 / FT232 / CH340 — needed to flash.          |
| Momentary push button  | Shutter; one leg to GPIO 13, other leg to GND.     |
| 5 V power supply       | The CAM is hungry; USB from a weak hub = brownout. |

### Flashing wiring (one-time dance)

```
ESP32-CAM       USB-serial adapter
---------       ------------------
U0T (TXD)  ---> RXD
U0R (RXD)  ---> TXD
5V         ---> 5V      (must be 5V, not 3.3V)
GND        ---> GND
IO0        ---> GND     (ONLY during flashing; remove after)
```

Procedure:
1. Wire up as above with **IO0 jumped to GND**.
2. Tap the onboard **RESET** button.
3. Run `pio run -t upload`.
4. When it's done, remove the IO0–GND jumper.
5. Tap RESET again to start the firmware normally.

### Runtime wiring

```
Shutter button   one leg -> GPIO 13
                 other leg -> GND
```

---

## First-time setup

1. Copy the template and edit it:
   ```bash
   cp include/config.h.example include/config.h
   ```
   Set `WIFI_SSID`, `WIFI_PASSWORD`, `BACKEND_BASE_URL`, `HARDWARE_ID`.
2. Flash using the dance above.
3. Open serial monitor at **115200 baud**.

---

## Pairing

Identical to the NFC logger, just with `device_type = "receipt_scanner"`.
On first boot the device prints a 6-digit code to serial; type it into the
ArthaSmart web app under **Settings → IoT Devices → Pair a device**. The
firmware saves the `api_key` to NVS and never pairs again unless wiped.

---

## Capture feedback

| Event                | Flash LED                       |
| -------------------- | ------------------------------- |
| Boot complete        | 2 short blinks                  |
| Capturing            | Solid on during exposure        |
| Upload succeeded     | 2 short blinks                  |
| Upload failed        | 5 slow blinks                   |
| Capture / camera err | 5 slow blinks                   |

---

## Troubleshooting

**`Brownout detector was triggered`** — underpowered supply. Use a proper
5 V / 1 A source, not a laptop USB 2 hub.

**Blurry photos** — the OV2640 has a small fixed-focus lens. Rotate the
lens housing a few degrees to refocus; there's a thread under the glass.

**Flash LED is blinding in a dark room** — lower the on-time in
`captureAndSend()` (the `delay(80)` before the keeper frame), or disable
the flash by leaving `PIN_FLASH_LED` disconnected and setting it to a
GPIO you never use.

**Upload is slow / times out** — SXGA JPEGs run ~80–150 KB. If your WiFi
is weak, drop `CAPTURE_FRAMESIZE` to `FRAMESIZE_VGA` in `config.h`.

---

## File layout

```
receipt-scanner/
├── platformio.ini
├── include/
│   ├── config.h.example
│   └── config.h            (gitignored)
├── src/
│   └── main.cpp
└── README.md
```
