import type { Device, DeviceStatus, DeviceType, FilterType } from "../types/smartHome";

export function getDeviceIconName(deviceType: DeviceType, status: DeviceStatus): string {
  if (deviceType === "DOOR") {
    return status === "OPEN" ? "lock-open-outline" : "lock-closed-outline";
  }

  if (deviceType === "AC") {
    return "snow-outline";
  }

  if (deviceType === "TEMP") {
    return "thermometer-outline";
  }

  return status === "ON" ? "bulb" : "bulb-outline";
}

export function getDeviceTypeLabel(deviceType: DeviceType): string {
  switch (deviceType) {
    case "LIGHT":
      return "Lights";
    case "DOOR":
      return "Doors";
    case "AC":
      return "AC";
    case "TEMP":
      return "Sensors";
  }
}

export function isDeviceActive(status: DeviceStatus): boolean {
  return status === "ON" || status === "OPEN";
}

export function getToggledStatus(device: Device): DeviceStatus {
  if (device.type === "DOOR") {
    return device.status === "OPEN" ? "CLOSE" : "OPEN";
  }

  return device.status === "ON" ? "OFF" : "ON";
}

export function mapFilterTypeToDeviceType(filterType: FilterType): DeviceType | null {
  switch (filterType) {
    case "LIGHT":
      return "LIGHT";
    case "DOOR":
      return "DOOR";
    case "AC":
      return "AC";
    case "TEMP":
      return "TEMP";
    case "ALL":
      return null;
  }
}

export function getStatusLabel(status: DeviceStatus): string {
  if (status === "OPEN") {
    return "ON";
  }

  if (status === "CLOSE") {
    return "OFF";
  }

  return status;
}
