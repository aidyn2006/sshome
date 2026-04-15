import { createContext, useCallback, useContext, useMemo, useState } from "react";

import {
  devices as initialDevices,
  events as initialEvents,
  homes as initialHomes,
  rooms as initialRooms,
  scenarios as initialScenarios
} from "../data/mockData";
import type { Device, DeviceStatus, Event, Home, Room, Scenario } from "../types/smartHome";
import { getToggledStatus } from "../utils/device";

type SmartHomeContextValue = {
  homes: Home[];
  rooms: Room[];
  devices: Device[];
  events: Event[];
  scenarios: Scenario[];
  toggleDevice: (deviceId: string) => void;
  setDeviceStatus: (deviceId: string, nextStatus: DeviceStatus) => void;
  runScenario: (scenarioId: string) => Scenario | null;
  addHome: (name: string) => void;
  addRoom: (name: string, homeId?: string) => void;
};

const SmartHomeContext = createContext<SmartHomeContextValue | null>(null);

function makeId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

export function SmartHomeProvider({ children }: { children: React.ReactNode }) {
  const [homes, setHomes] = useState<Home[]>(initialHomes);
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [scenarios] = useState<Scenario[]>(initialScenarios);

  const pushDeviceEvent = useCallback((deviceId: string, action: DeviceStatus) => {
    const event: Event = {
      id: makeId("e"),
      type: "DEVICE",
      device_id: deviceId,
      action,
      timestamp: Date.now()
    };

    setEvents((prev) => [event, ...prev]);
  }, []);

  const setDeviceStatus = useCallback(
    (deviceId: string, nextStatus: DeviceStatus) => {
      setDevices((prev) => {
        const current = prev.find((item) => item.id === deviceId);
        if (!current || current.status === nextStatus) {
          return prev;
        }

        pushDeviceEvent(deviceId, nextStatus);

        return prev.map((item) =>
          item.id === deviceId
            ? {
                ...item,
                status: nextStatus
              }
            : item
        );
      });
    },
    [pushDeviceEvent]
  );

  const toggleDevice = useCallback(
    (deviceId: string) => {
      const target = devices.find((item) => item.id === deviceId);
      if (!target) {
        return;
      }

      setDeviceStatus(deviceId, getToggledStatus(target));
    },
    [devices, setDeviceStatus]
  );

  const runScenario = useCallback(
    (scenarioId: string): Scenario | null => {
      const scenario = scenarios.find((item) => item.id === scenarioId);
      if (!scenario) {
        return null;
      }

      setDevices((prev) => {
        const next = prev.map((device) => {
          const action = scenario.actions.find((item) => item.device_id === device.id);
          if (!action) {
            return device;
          }

          return {
            ...device,
            status: action.action
          };
        });

        return next;
      });

      setEvents((prev) => {
        const sceneEvent: Event = {
          id: makeId("scene"),
          type: "SCENE",
          scene_id: scenario.id,
          scene_name: scenario.name,
          timestamp: Date.now()
        };

        const actionEvents: Event[] = scenario.actions.map((item) => ({
          id: makeId("e"),
          type: "DEVICE",
          device_id: item.device_id,
          action: item.action,
          timestamp: Date.now()
        }));

        return [sceneEvent, ...actionEvents, ...prev];
      });

      return scenario;
    },
    [scenarios]
  );

  const addHome = useCallback((name: string) => {
    if (!name.trim()) {
      return;
    }

    setHomes((prev) => [
      ...prev,
      {
        id: makeId("home"),
        name: name.trim(),
        owner_id: "user_01"
      }
    ]);
  }, []);

  const addRoom = useCallback(
    (name: string, homeId?: string) => {
      if (!name.trim()) {
        return;
      }

      const selectedHomeId = homeId || homes[0]?.id;
      if (!selectedHomeId) {
        return;
      }

      setRooms((prev) => [
        ...prev,
        {
          id: makeId("room"),
          name: name.trim(),
          home_id: selectedHomeId,
          emoji: "🏠"
        }
      ]);
    },
    [homes]
  );

  const value = useMemo(
    () => ({
      homes,
      rooms,
      devices,
      events,
      scenarios,
      toggleDevice,
      setDeviceStatus,
      runScenario,
      addHome,
      addRoom
    }),
    [homes, rooms, devices, events, scenarios, toggleDevice, setDeviceStatus, runScenario, addHome, addRoom]
  );

  return <SmartHomeContext.Provider value={value}>{children}</SmartHomeContext.Provider>;
}

export function useSmartHome() {
  const context = useContext(SmartHomeContext);
  if (!context) {
    throw new Error("useSmartHome must be used within SmartHomeProvider");
  }

  return context;
}
