#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// -------------------------
// USER CONFIG
// -------------------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST = "YOUR_MQTT_HOST";
const uint16_t MQTT_PORT = 8883;

const char* MQTT_USERNAME = "YOUR_MQTT_USERNAME";
const char* MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";

const char* HARDWARE_ID = "sshome_20260523_zpulz0";
const char* DEVICE_SECRET = "YOUR_DEVICE_SECRET";

// -------------------------
// PINS
// -------------------------
const uint8_t DHT_PIN = D4;
const uint8_t DHT_TYPE = DHT22;

const uint8_t BUTTON_PIN = D5;

// -------------------------
// TELEMETRY
// -------------------------
const unsigned long TELEMETRY_INTERVAL_MS = 15000;

unsigned long lastTelemetryAt = 0;

// debounce
bool lastButtonState = HIGH;
bool currentButtonState = HIGH;

unsigned long lastDebounceTime = 0;
const unsigned long DEBOUNCE_DELAY = 50;

// -------------------------
// MQTT
// -------------------------
BearSSL::WiFiClientSecure tlsClient;
PubSubClient mqttClient(tlsClient);

DHT dht(DHT_PIN, DHT_TYPE);

String telemetryTopic;
String errorsTopic;

// -------------------------
// WIFI
// -------------------------
void connectWiFi() {

  if (WiFi.status() == WL_CONNECTED) {
    return;
  }

  WiFi.mode(WIFI_STA);
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.printf("\n[WIFI] Connected. IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

// -------------------------
// MQTT CONNECT
// -------------------------
void connectMqtt() {

  while (!mqttClient.connected()) {

    String clientId =
      "sshome-temp-" + String(ESP.getChipId(), HEX);

    Serial.printf("[MQTT] Connecting as %s ...\n", clientId.c_str());
    if (mqttClient.connect(
          clientId.c_str(),
          MQTT_USERNAME,
          MQTT_PASSWORD
        )) {
      Serial.println("[MQTT] Connected");

      break;

    }

    Serial.printf("[MQTT] Connect failed, state=%d. Retry in 2s\n", mqttClient.state());
    delay(2000);
  }
}

// -------------------------
// ERROR PUBLISH
// -------------------------
void publishError(const char* message) {

  StaticJsonDocument<256> doc;

  doc["secret"] = DEVICE_SECRET;
  doc["message"] = message;

  char buffer[256];

  size_t n =
    serializeJson(doc, buffer, sizeof(buffer));

mqttClient.publish(errorsTopic.c_str(),
                   (const uint8_t*)buffer,
                   n,
                   false);
  Serial.printf("[MQTT] Error published to %s: %s\n", errorsTopic.c_str(), message);
}

// -------------------------
// TELEMETRY PUBLISH
// -------------------------
void publishTelemetry() {

  float t = dht.readTemperature();
  float h = dht.readHumidity();

  if (isnan(t) || isnan(h)) {

    publishError("DHT22 read failed");
    return;
  }

  int rssi = WiFi.RSSI();

  StaticJsonDocument<256> doc;

  doc["secret"] = DEVICE_SECRET;
  doc["temp"] = t;
  doc["humidity"] = h;
  doc["rssi"] = rssi;
  doc["battery"] = 100;

  char buffer[256];

  size_t n =
    serializeJson(doc, buffer, sizeof(buffer));

mqttClient.publish(telemetryTopic.c_str(),
                   (const uint8_t*)buffer,
                   n,
                   false);
  Serial.printf("[MQTT] Telemetry published to %s temp=%.2f hum=%.2f rssi=%d\n", telemetryTopic.c_str(), t, h, rssi);
}

// -------------------------
// SETUP
// -------------------------
void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[BOOT] NodeMCU DHT22 firmware start");
  Serial.printf("[BOOT] hardware_id=%s\n", HARDWARE_ID);

  telemetryTopic =
    "devices/" + String(HARDWARE_ID) + "/telemetry";

  errorsTopic =
    "devices/" + String(HARDWARE_ID) + "/errors";

  pinMode(BUTTON_PIN, INPUT_PULLUP);

  dht.begin();

  tlsClient.setInsecure();

  mqttClient.setServer(
    MQTT_HOST,
    MQTT_PORT
  );

  connectWiFi();
  connectMqtt();
}

// -------------------------
// LOOP
// -------------------------
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[WIFI] Lost connection, reconnecting...");
    connectWiFi();
  }

  if (!mqttClient.connected()) {
    Serial.println("[MQTT] Disconnected, reconnecting...");
    connectMqtt();
  }

  mqttClient.loop();

  // -------------------------
  // TIMER TELEMETRY
  // -------------------------
  unsigned long now = millis();

  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {

    lastTelemetryAt = now;

    publishTelemetry();
  }

  // -------------------------
  // BUTTON TELEMETRY
  // -------------------------
  bool reading = digitalRead(BUTTON_PIN);

  if (reading != lastButtonState) {
    lastDebounceTime = millis();
  }

  if ((millis() - lastDebounceTime) > DEBOUNCE_DELAY) {

    if (reading == LOW &&
        currentButtonState == HIGH) {
      Serial.println("[BTN] Press detected -> publish telemetry");
      publishTelemetry();
    }

    currentButtonState = reading;
  }

  lastButtonState = reading;
}
