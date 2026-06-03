#include <ESP8266WiFi.h>
#include <WiFiClientSecureBearSSL.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Servo.h>

// -------------------------
// USER CONFIG
// -------------------------
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";

const char* MQTT_HOST = "YOUR_MQTT_HOST";
const uint16_t MQTT_PORT = 8883;
const char* MQTT_USERNAME = "YOUR_MQTT_USERNAME";
const char* MQTT_PASSWORD = "YOUR_MQTT_PASSWORD";

// NodeMCU #2 emulates TWO logical devices
// Device A: LIGHT (built-in LED)
const char* HW_ID_LIGHT = "sshome_20260523_tnthu5";
const char* SECRET_LIGHT = "YOUR_LIGHT_DEVICE_SECRET";

// Device B: DOOR (servo)
const char* HW_ID_DOOR = "sshome_20260523_yv28vx";
const char* SECRET_DOOR = "YOUR_DOOR_DEVICE_SECRET";

// Wiring
const uint8_t SERVO_PIN = D5;       // GPIO14
const uint8_t LED_BUILTIN_PIN = LED_BUILTIN; // active LOW on many NodeMCU

const int SERVO_OPEN_ANGLE = 90;
const int SERVO_CLOSE_ANGLE = 0;

const unsigned long TELEMETRY_INTERVAL_MS = 20000;

BearSSL::WiFiClientSecure tlsClient;
PubSubClient mqttClient(tlsClient);
Servo doorServo;

String topicCmdLight;
String topicCmdDoor;
String topicTeleLight;
String topicErrLight;
String topicTeleDoor;
String topicErrDoor;

unsigned long lastTelemetryAt = 0;

void connectWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;

  WiFi.mode(WIFI_STA);
  Serial.printf("[WIFI] Connecting to SSID: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    Serial.print(".");
    delay(500);
  }
  Serial.printf("\n[WIFI] Connected. IP=%s RSSI=%d\n", WiFi.localIP().toString().c_str(), WiFi.RSSI());
}

void publishError(const String& topic, const char* secret, const char* message) {
  StaticJsonDocument<256> doc;
  doc["secret"] = secret;
  doc["message"] = message;

  char buffer[256];
  size_t n = serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topic.c_str(), buffer, n, false);
  Serial.printf("[MQTT] Error published to %s: %s\n", topic.c_str(), message);
}

void publishTelemetry(const String& topic, const char* secret) {
  StaticJsonDocument<256> doc;
  doc["secret"] = secret;
  doc["rssi"] = WiFi.RSSI();
  doc["battery"] = 100;

  char buffer[192];
  size_t n = serializeJson(doc, buffer, sizeof(buffer));
  mqttClient.publish(topic.c_str(), buffer, n, false);
  Serial.printf("[MQTT] Telemetry published to %s rssi=%d\n", topic.c_str(), WiFi.RSSI());
}

void applyLight(int value) {
  // Built-in LED is usually active LOW: 0=ON, 1=OFF
  if (value == 1) {
    digitalWrite(LED_BUILTIN_PIN, LOW);
    Serial.println("[LIGHT] LED ON");
  } else {
    digitalWrite(LED_BUILTIN_PIN, HIGH);
    Serial.println("[LIGHT] LED OFF");
  }
}

void applyDoorAction(const char* action) {
  if (strcmp(action, "open_door") == 0) {
    doorServo.write(SERVO_OPEN_ANGLE);
    Serial.println("[DOOR] OPEN");
  } else if (strcmp(action, "close_door") == 0) {
    doorServo.write(SERVO_CLOSE_ANGLE);
    Serial.println("[DOOR] CLOSE");
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (err) {
    publishError(topicErrLight, SECRET_LIGHT, "Invalid command JSON");
    return;
  }

  const char* action = doc["action"] | "";
  int value = doc["value"] | 0;
  Serial.printf("[MQTT] Command topic=%s action=%s value=%d\n", topic, action, value);

  if (String(topic) == topicCmdLight) {
    if (strcmp(action, "toggle_light") == 0) {
      applyLight(value);
    }
  } else if (String(topic) == topicCmdDoor) {
    applyDoorAction(action);
  }
}

void connectMqtt() {
  while (!mqttClient.connected()) {
    String clientId = "sshome-act-" + String(ESP.getChipId(), HEX);
    Serial.printf("[MQTT] Connecting as %s ...\n", clientId.c_str());
    if (mqttClient.connect(clientId.c_str(), MQTT_USERNAME, MQTT_PASSWORD)) {
      mqttClient.subscribe(topicCmdLight.c_str());
      mqttClient.subscribe(topicCmdDoor.c_str());
      Serial.printf("[MQTT] Connected. Subscribed: %s and %s\n", topicCmdLight.c_str(), topicCmdDoor.c_str());
      break;
    }
    Serial.printf("[MQTT] Connect failed, state=%d. Retry in 2s\n", mqttClient.state());
    delay(2000);
  }
}

void setup() {
  Serial.begin(115200);
  delay(200);
  Serial.println("\n[BOOT] NodeMCU Servo/Light dual-ID firmware start");
  Serial.printf("[BOOT] light_id=%s door_id=%s\n", HW_ID_LIGHT, HW_ID_DOOR);

  pinMode(LED_BUILTIN_PIN, OUTPUT);
  digitalWrite(LED_BUILTIN_PIN, HIGH); // LED off

  doorServo.attach(SERVO_PIN);
  doorServo.write(SERVO_CLOSE_ANGLE);

  topicCmdLight = "devices/" + String(HW_ID_LIGHT) + "/commands";
  topicCmdDoor = "devices/" + String(HW_ID_DOOR) + "/commands";

  topicTeleLight = "devices/" + String(HW_ID_LIGHT) + "/telemetry";
  topicErrLight = "devices/" + String(HW_ID_LIGHT) + "/errors";

  topicTeleDoor = "devices/" + String(HW_ID_DOOR) + "/telemetry";
  topicErrDoor = "devices/" + String(HW_ID_DOOR) + "/errors";

  tlsClient.setInsecure(); // demo mode; for production pin CA cert
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  connectWiFi();
  connectMqtt();
}

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

  unsigned long now = millis();
  if (now - lastTelemetryAt >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryAt = now;
    publishTelemetry(topicTeleLight, SECRET_LIGHT);
    publishTelemetry(topicTeleDoor, SECRET_DOOR);
  }
}
