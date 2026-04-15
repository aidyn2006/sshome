import type { Device, Event, Home, Room, Scenario } from "../types/smartHome";

export const homes: Home[] = [{ id: "1", name: "My Home", owner_id: "user_01" }];

export const rooms: Room[] = [
  { id: "r1", name: "Living Room", home_id: "1", emoji: "🛋️" },
  { id: "r2", name: "Bedroom", home_id: "1", emoji: "🛏️" },
  { id: "r3", name: "Kitchen", home_id: "1", emoji: "🍳" },
  { id: "r4", name: "Bathroom", home_id: "1", emoji: "🚿" }
];

export const devices: Device[] = [
  { id: "d1", name: "Ceiling Light", type: "LIGHT", status: "ON", room_id: "r1" },
  { id: "d2", name: "Front Door", type: "DOOR", status: "CLOSE", room_id: "r1" },
  { id: "d3", name: "Air Conditioner", type: "AC", status: "ON", room_id: "r2" },
  { id: "d4", name: "Bedroom Light", type: "LIGHT", status: "OFF", room_id: "r2" },
  { id: "d5", name: "Thermostat", type: "TEMP", status: "ON", room_id: "r3" },
  { id: "d6", name: "Kitchen Light", type: "LIGHT", status: "OFF", room_id: "r3" }
];

export const events: Event[] = [
  { id: "e1", type: "DEVICE", device_id: "d1", action: "ON", timestamp: Date.now() - 120000 },
  { id: "e2", type: "DEVICE", device_id: "d2", action: "CLOSE", timestamp: Date.now() - 300000 },
  { id: "e3", type: "DEVICE", device_id: "d3", action: "ON", timestamp: Date.now() - 3600000 }
];

export const scenarios: Scenario[] = [
  {
    id: "s1",
    name: "Leave Home",
    description: "Turn off all lights, lock doors",
    actions: [
      { device_id: "d1", action: "OFF" },
      { device_id: "d2", action: "CLOSE" }
    ]
  },
  {
    id: "s2",
    name: "Good Morning",
    description: "Lights on, AC on",
    actions: [
      { device_id: "d4", action: "ON" },
      { device_id: "d3", action: "ON" }
    ]
  },
  {
    id: "s3",
    name: "Movie Mode",
    description: "Dim lights, close blinds",
    actions: [{ device_id: "d1", action: "OFF" }]
  },
  {
    id: "s4",
    name: "Night Mode",
    description: "All off except bedroom light",
    actions: [
      { device_id: "d1", action: "OFF" },
      { device_id: "d6", action: "OFF" }
    ]
  }
];
