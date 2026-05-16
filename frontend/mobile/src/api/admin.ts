import { apiRequest } from "./client";
import type { UserOut } from "../types/auth";
import type { Device } from "../types/smartHome";

export type AdminUser = UserOut;

export type ManufacturedDevice = {
  hardware_id: string;
  device_type: Device["type"];
  secret?: string | null;
  secret_hash?: string | null;
  batch: string;
  claimed: boolean;
};

export type AuditLogEntry = {
  id: string;
  user_id: string | null;
  action: string;
  timestamp: string;
  ip_address: string | null;
};

type GenerateManufacturedDevicesPayload = {
  count: number;
  deviceType: Device["type"];
};

type UpdateUserRolePayload = {
  role: UserOut["role"];
};

export async function generateManufacturedDevices(
  token: string,
  payload: GenerateManufacturedDevicesPayload
): Promise<{ devices: ManufacturedDevice[] }> {
  return apiRequest<{ devices: ManufacturedDevice[] }>("/api/v1/admin/devices/generate", {
    method: "POST",
    token,
    body: {
      count: payload.count,
      device_type: payload.deviceType
    }
  });
}

export async function listAdminUsers(token: string): Promise<AdminUser[]> {
  return apiRequest<AdminUser[]>("/api/v1/admin/users", {
    method: "GET",
    token
  });
}

export async function updateAdminUserRole(
  token: string,
  userId: string,
  payload: UpdateUserRolePayload
): Promise<AdminUser> {
  return apiRequest<AdminUser>(`/api/v1/admin/users/${userId}/role`, {
    method: "PATCH",
    token,
    body: payload
  });
}

export async function listAuditLogs(token: string, limit = 20): Promise<AuditLogEntry[]> {
  return apiRequest<AuditLogEntry[]>(`/api/v1/logs?limit=${limit}`, {
    method: "GET",
    token
  });
}
