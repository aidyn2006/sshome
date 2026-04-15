import type { Device, DeviceStatus, Home, IoTEvent, IoTSeedState, Room, Scenario } from "../types/iot";

function isoMinutesAgo(minutesAgo: number): string {
  return new Date(Date.now() - minutesAgo * 60 * 1000).toISOString();
}

function buildDevice(
  id: string,
  name: string,
  type: Device["type"],
  status: DeviceStatus,
  roomId: string,
  ownerId: string
): Device {
  return {
    id,
    name,
    type,
    status,
    roomId,
    ownerId
  };
}

export function createSeedState(ownerId: string): IoTSeedState {
  const homes: Home[] = [
    { id: "home-main", name: "Main Home", ownerId },
    { id: "home-country", name: "Country House", ownerId }
  ];

  const rooms: Room[] = [
    { id: "room-living", name: "Living Room", homeId: "home-main" },
    { id: "room-kitchen", name: "Kitchen", homeId: "home-main" },
    { id: "room-hall", name: "Hall", homeId: "home-main" },
    { id: "room-country", name: "Country Bedroom", homeId: "home-country" }
  ];

  const devices: Device[] = [
    buildDevice("dev-living-light", "Ceiling Light", "LIGHT", "OFF", "room-living", ownerId),
    buildDevice("dev-front-door", "Front Door", "DOOR", "CLOSED", "room-hall", ownerId),
    buildDevice("dev-ac-main", "Main AC", "AC", "ON", "room-living", ownerId),
    buildDevice("dev-kitchen-temp", "Kitchen Temp Sensor", "TEMP", "ON", "room-kitchen", ownerId),
    buildDevice("dev-country-light", "Country Lamp", "LIGHT", "OFF", "room-country", ownerId)
  ];

  const scenarios: Scenario[] = [
    {
      id: "sc-away",
      name: "Away Mode",
      description: "Turns off lights and closes the front door.",
      ownerId,
      actions: [
        { deviceId: "dev-living-light", action: "TURN_OFF" },
        { deviceId: "dev-country-light", action: "TURN_OFF" },
        { deviceId: "dev-front-door", action: "CLOSE" }
      ]
    },
    {
      id: "sc-welcome",
      name: "Welcome Home",
      description: "Opens door and turns lights on.",
      ownerId,
      actions: [
        { deviceId: "dev-front-door", action: "OPEN" },
        { deviceId: "dev-living-light", action: "TURN_ON" }
      ]
    }
  ];

  const events: IoTEvent[] = [
    {
      id: "evt-1",
      deviceId: "dev-front-door",
      action: "CLOSE",
      timestamp: isoMinutesAgo(12),
      ownerId,
      source: "MANUAL"
    },
    {
      id: "evt-2",
      deviceId: "dev-ac-main",
      action: "TURN_ON",
      timestamp: isoMinutesAgo(30),
      ownerId,
      source: "SCENARIO"
    },
    {
      id: "evt-3",
      deviceId: "dev-living-light",
      action: "TURN_OFF",
      timestamp: isoMinutesAgo(42),
      ownerId,
      source: "MANUAL"
    }
  ];

  return {
    homes,
    rooms,
    devices,
    events,
    scenarios
  };
}
