export type DeviceType = "LIGHT" | "DOOR" | "AC" | "TEMP";

export type DeviceStatus = "ON" | "OFF" | "OPEN" | "CLOSE";

export type DeviceAction = "TURN_ON" | "TURN_OFF" | "OPEN" | "CLOSE";

export type EventAction = "ON" | "OFF" | "OPEN" | "CLOSE";

export type EventSource = "MANUAL" | "SCENARIO";

export type Home = {
  id: string;
  name: string;
  ownerId: string;
};

export type Room = {
  id: string;
  name: string;
  homeId: string;
};

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  roomId: string;
  ownerId: string;
};

export type IoTEvent = {
  id: string;
  deviceId: string;
  action: EventAction;
  timestamp: string;
  ownerId: string;
  source: EventSource;
};

export type ScenarioActionItem = {
  deviceId: string;
  action: DeviceAction;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  actions: ScenarioActionItem[];
  ownerId: string;
};

export type IoTSeedState = {
  homes: Home[];
  rooms: Room[];
  devices: Device[];
  events: IoTEvent[];
  scenarios: Scenario[];
};
