import { apiRequest } from "./client";
import type { DeviceAction, DeviceType } from "../types/smartHome";

export type ApiHome = {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
};

export type ApiRoom = {
  id: string;
  name: string;
  home_id: string;
  created_at: string;
};

export type ApiDevice = {
  id: string;
  name: string;
  type: DeviceType;
  status: "ON" | "OFF" | "OPEN" | "CLOSED";
  room_id: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
};

export type ApiEvent = {
  id: string;
  device_id: string;
  action: DeviceAction;
  timestamp: string;
  owner_id: string;
};

export type ApiScenarioAction = {
  device_id: string;
  action: DeviceAction;
};

export type ApiScenario = {
  id: string;
  name: string;
  description: string | null;
  actions: ApiScenarioAction[];
  owner_id: string;
  created_at: string;
};

export type ApiScenarioRunResult = {
  scenario_id: string;
  executed_actions: number;
  devices: ApiDevice[];
};

export async function listHomes(token: string): Promise<ApiHome[]> {
  return apiRequest<ApiHome[]>("/api/v1/homes", { method: "GET", token });
}

export async function createHome(token: string, name: string): Promise<ApiHome> {
  return apiRequest<ApiHome>("/api/v1/homes", {
    method: "POST",
    token,
    body: { name }
  });
}

export async function listRooms(token: string): Promise<ApiRoom[]> {
  return apiRequest<ApiRoom[]>("/api/v1/rooms", { method: "GET", token });
}

export async function createRoom(token: string, name: string, homeId: string): Promise<ApiRoom> {
  return apiRequest<ApiRoom>("/api/v1/rooms", {
    method: "POST",
    token,
    body: {
      name,
      home_id: homeId
    }
  });
}

export async function listDevices(token: string): Promise<ApiDevice[]> {
  return apiRequest<ApiDevice[]>("/api/v1/devices", { method: "GET", token });
}

export async function createDevice(
  token: string,
  payload: { name: string; type: DeviceType; roomId: string }
): Promise<ApiDevice> {
  return apiRequest<ApiDevice>("/api/v1/devices", {
    method: "POST",
    token,
    body: {
      name: payload.name,
      type: payload.type,
      room_id: payload.roomId
    }
  });
}

export async function applyDeviceAction(
  token: string,
  payload: { deviceId: string; action: DeviceAction }
): Promise<ApiDevice> {
  return apiRequest<ApiDevice>(`/api/v1/devices/${payload.deviceId}/action`, {
    method: "POST",
    token,
    body: {
      action: payload.action
    }
  });
}

export async function listEvents(token: string): Promise<ApiEvent[]> {
  return apiRequest<ApiEvent[]>("/api/v1/events", { method: "GET", token });
}

export async function listScenarios(token: string): Promise<ApiScenario[]> {
  return apiRequest<ApiScenario[]>("/api/v1/scenarios", { method: "GET", token });
}

export async function createScenario(
  token: string,
  payload: { name: string; description: string | null; actions: ApiScenarioAction[] }
): Promise<ApiScenario> {
  return apiRequest<ApiScenario>("/api/v1/scenarios", {
    method: "POST",
    token,
    body: payload
  });
}

export async function runScenario(token: string, scenarioId: string): Promise<ApiScenarioRunResult> {
  return apiRequest<ApiScenarioRunResult>(`/api/v1/scenarios/${scenarioId}/run`, {
    method: "POST",
    token
  });
}
