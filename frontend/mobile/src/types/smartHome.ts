export type DeviceType = "LIGHT" | "DOOR" | "AC" | "TEMP";

export type DeviceStatus = "ON" | "OFF" | "OPEN" | "CLOSE";

export type FilterType = "ALL" | "LIGHT" | "DOOR" | "AC" | "TEMP";

export type Home = {
  id: string;
  name: string;
  owner_id: string;
};

export type Room = {
  id: string;
  name: string;
  home_id: string;
  emoji: string;
};

export type Device = {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  room_id: string;
};

export type DeviceEvent = {
  id: string;
  type: "DEVICE";
  device_id: string;
  action: DeviceStatus;
  timestamp: number;
};

export type SceneEvent = {
  id: string;
  type: "SCENE";
  scene_id: string;
  scene_name: string;
  timestamp: number;
};

export type Event = DeviceEvent | SceneEvent;

export type ScenarioAction = {
  device_id: string;
  action: DeviceStatus;
};

export type Scenario = {
  id: string;
  name: string;
  description: string;
  actions: ScenarioAction[];
};

export type DateFilter = "today" | "week" | "month";
