# Firmware for your setup

This folder contains 2 Arduino sketches for NodeMCU (ESP8266):

1. `nodemcu_dht22/nodemcu_dht22.ino`
- Publishes telemetry (`temp`, `humidity`, `rssi`, `battery`) to one device ID.

2. `nodemcu_servo_dual_id/nodemcu_servo_dual_id.ino`
- One physical NodeMCU emulates two logical devices:
  - LIGHT device: controls built-in LED
  - DOOR device: controls servo
- Uses two `hardware_id` and two `secret` values.

## Required Arduino libraries

Install from Library Manager:
- `PubSubClient`
- `ArduinoJson`
- `DHT sensor library` (Adafruit)
- `Adafruit Unified Sensor`
- `Servo`

## Fill before flashing

In each `.ino`, replace:
- Wi-Fi (`WIFI_SSID`, `WIFI_PASSWORD`)
- HiveMQ credentials (`MQTT_HOST`, `MQTT_USERNAME`, `MQTT_PASSWORD`)
- Device IDs and secrets from your `manufactured_secrets.txt`

## Backend expectations (already in your project)

Topics:
- `devices/{hardware_id}/commands`
- `devices/{hardware_id}/telemetry`
- `devices/{hardware_id}/errors`

Payload must include `secret` for auth.

## Registering in app

You should register in mobile app:
- DHT board ID as `TEMP`
- LED ID as `LIGHT`
- Servo ID as `DOOR`

Then backend will send commands to the correct topics and show telemetry.
