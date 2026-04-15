export type DeviceType = "LIGHT" | "DOOR" | "AC" | "TEMP";

export type DeviceStatus = "ON" | "OFF" | "OPEN" | "CLOSED";

export type DeviceAction = "TURN_ON" | "TURN_OFF" | "OPEN" | "CLOSE";

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
  owner_id?: string;
  created_at?: string;
  updated_at?: string;
};

export type DeviceEvent = {
  id: string;
  type: "DEVICE";
  device_id: string;
  action: DeviceAction;
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
  action: DeviceAction;
};

export type Scenario = {
  id: string;
  name: string;
  description: string | null;
  actions: ScenarioAction[];
};

export type DateFilter = "today" | "week" | "month";
