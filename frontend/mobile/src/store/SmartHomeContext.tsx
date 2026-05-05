import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from "react";
import { Alert } from "react-native";

import {
  getAuthContext,
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshAccessToken,
  register as registerRequest
} from "../api/auth";
import { UnauthorizedError, isApiError } from "../api/client";
import {
  applyDeviceAction,
  createDevice,
  createHome,
  createRoom,
  createScenario,
  listDevices,
  listEvents,
  listHomes,
  listRooms,
  listScenarios,
  runScenario as runScenarioRequest,
  type ApiDevice,
  type ApiEvent,
  type ApiHome,
  type ApiRoom,
  type ApiScenario
} from "../api/smartHome";
import type { LoginPayload, RegisterPayload, UserOut } from "../types/auth";
import type {
  Device,
  DeviceAction,
  DeviceStatus,
  Event,
  Home,
  Room,
  Scenario
} from "../types/smartHome";
import { mapActionToStatus } from "../utils/device";

type AuthStatus = "anonymous" | "loading" | "authenticated";

type SmartHomeContextValue = {
  authStatus: AuthStatus;
  user: UserOut | null;
  ownerId: string | null;
  authError: string | null;
  isAuthSubmitting: boolean;
  isDataLoading: boolean;
  homes: Home[];
  rooms: Room[];
  devices: Device[];
  events: Event[];
  scenarios: Scenario[];
  login: (payload: LoginPayload) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  refreshData: () => Promise<void>;
  toggleDevice: (deviceId: string) => Promise<void>;
  setDeviceStatus: (deviceId: string, nextStatus: DeviceStatus) => Promise<void>;
  runScenario: (scenarioId: string) => Promise<Scenario | null>;
  addHome: (name: string) => Promise<void>;
  addRoom: (name: string, homeId?: string) => Promise<void>;
};

type SessionTokens = {
  accessToken: string;
  refreshToken: string;
};

type DemoRoomBlueprint = {
  key: string;
  name: string;
};

type DemoDeviceBlueprint = {
  key: string;
  name: string;
  type: Device["type"];
  roomKey: string;
  initialAction?: DeviceAction;
};

type DemoScenarioBlueprint = {
  name: string;
  description: string;
  actions: Array<{ deviceKey: string; action: DeviceAction }>;
};

const demoRooms: DemoRoomBlueprint[] = [
  { key: "living", name: "Living Room" },
  { key: "bedroom", name: "Bedroom" },
  { key: "kitchen", name: "Kitchen" },
  { key: "bathroom", name: "Bathroom" }
];

const demoDevices: DemoDeviceBlueprint[] = [
  { key: "ceiling-light", name: "Ceiling Light", type: "LIGHT", roomKey: "living", initialAction: "TURN_ON" },
  { key: "front-door", name: "Front Door", type: "DOOR", roomKey: "living" },
  { key: "air-conditioner", name: "Air Conditioner", type: "AC", roomKey: "bedroom", initialAction: "TURN_ON" },
  { key: "bedroom-light", name: "Bedroom Light", type: "LIGHT", roomKey: "bedroom" },
  { key: "thermostat", name: "Thermostat", type: "TEMP", roomKey: "kitchen" },
  { key: "kitchen-light", name: "Kitchen Light", type: "LIGHT", roomKey: "kitchen" }
];

const demoScenarios: DemoScenarioBlueprint[] = [
  {
    name: "Leave Home",
    description: "Turn off all lights and secure the entry points",
    actions: [
      { deviceKey: "ceiling-light", action: "TURN_OFF" },
      { deviceKey: "front-door", action: "CLOSE" },
      { deviceKey: "air-conditioner", action: "TURN_OFF" },
      { deviceKey: "bedroom-light", action: "TURN_OFF" },
      { deviceKey: "kitchen-light", action: "TURN_OFF" }
    ]
  },
  {
    name: "Good Morning",
    description: "Wake the house up with light and air",
    actions: [
      { deviceKey: "bedroom-light", action: "TURN_ON" },
      { deviceKey: "air-conditioner", action: "TURN_ON" }
    ]
  },
  {
    name: "Movie Mode",
    description: "Dim the lights for a calmer evening",
    actions: [{ deviceKey: "ceiling-light", action: "TURN_OFF" }]
  },
  {
    name: "Night Mode",
    description: "Keep the house quiet and ready for sleep",
    actions: [
      { deviceKey: "ceiling-light", action: "TURN_OFF" },
      { deviceKey: "kitchen-light", action: "TURN_OFF" }
    ]
  }
];

const SmartHomeContext = createContext<SmartHomeContextValue | null>(null);

function makeLocalId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  if (isApiError(error) && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

function deriveRoomEmoji(name: string): string {
  const normalizedName = name.trim().toLowerCase();

  if (normalizedName.includes("bed")) {
    return "🛏️";
  }

  if (normalizedName.includes("kitchen")) {
    return "🍳";
  }

  if (normalizedName.includes("bath")) {
    return "🛁";
  }

  if (normalizedName.includes("living")) {
    return "🛋️";
  }

  return "🏠";
}

function mapHome(home: ApiHome): Home {
  return {
    id: home.id,
    name: home.name,
    owner_id: home.owner_id
  };
}

function mapRoom(room: ApiRoom): Room {
  return {
    id: room.id,
    name: room.name,
    home_id: room.home_id,
    emoji: deriveRoomEmoji(room.name)
  };
}

function mapDevice(device: ApiDevice): Device {
  return {
    id: device.id,
    name: device.name,
    type: device.type,
    status: device.status,
    room_id: device.room_id,
    owner_id: device.owner_id,
    created_at: device.created_at,
    updated_at: device.updated_at
  };
}

function mapScenario(scenario: ApiScenario): Scenario {
  return {
    id: scenario.id,
    name: scenario.name,
    description: scenario.description,
    actions: scenario.actions
  };
}

function mapEvent(event: ApiEvent): Event {
  return {
    id: event.id,
    type: "DEVICE",
    device_id: event.device_id,
    action: event.action,
    timestamp: new Date(event.timestamp).getTime()
  };
}

function sortEventsByNewest(events: Event[]): Event[] {
  return [...events].sort((left, right) => right.timestamp - left.timestamp);
}

function mergeUpdatedDeviceList(currentDevices: Device[], updatedDevices: Device[]): Device[] {
  const deviceMap = new Map(currentDevices.map((device) => [device.id, device]));

  updatedDevices.forEach((device) => {
    deviceMap.set(device.id, device);
  });

  return Array.from(deviceMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function buildDeviceEvent(deviceId: string, action: DeviceAction, timestamp = Date.now()): Event {
  return {
    id: makeLocalId("event"),
    type: "DEVICE",
    device_id: deviceId,
    action,
    timestamp
  };
}

function buildSceneEvent(scenario: Scenario): Event {
  return {
    id: makeLocalId("scene"),
    type: "SCENE",
    scene_id: scenario.id,
    scene_name: scenario.name,
    timestamp: Date.now()
  };
}

function resolveActionForStatus(device: Device, nextStatus: DeviceStatus): DeviceAction {
  if (device.type === "DOOR" || device.type === "WINDOW") {
    return nextStatus === "OPEN" ? "OPEN" : "CLOSE";
  }

  return nextStatus === "ON" ? "TURN_ON" : "TURN_OFF";
}

function normalizeSession(tokens: { access_token?: string; refresh_token?: string; token?: string }): SessionTokens {
  const accessToken = tokens.access_token || tokens.token;
  if (!accessToken) {
    throw new Error("Authentication token is missing in server response");
  }

  return {
    accessToken,
    refreshToken: tokens.refresh_token || ""
  };
}

export function SmartHomeProvider({ children }: { children: React.ReactNode }) {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("anonymous");
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [user, setUser] = useState<UserOut | null>(null);
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [homes, setHomes] = useState<Home[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceEvents, setDeviceEvents] = useState<Event[]>([]);
  const [sceneEvents, setSceneEvents] = useState<Event[]>([]);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);

  const sessionRef = useRef<SessionTokens | null>(null);

  const setSessionTokens = useCallback((tokens: SessionTokens | null) => {
    sessionRef.current = tokens;
  }, []);

  const clearSessionState = useCallback(() => {
    setSessionTokens(null);
    setAuthStatus("anonymous");
    setUser(null);
    setOwnerId(null);
    setHomes([]);
    setRooms([]);
    setDevices([]);
    setDeviceEvents([]);
    setSceneEvents([]);
    setScenarios([]);
  }, [setSessionTokens]);

  const hydrateState = useCallback(async (accessToken: string) => {
    setIsDataLoading(true);

    try {
      const [nextHomes, nextRooms, nextDevices, nextEvents, nextScenarios] = await Promise.all([
        listHomes(accessToken),
        listRooms(accessToken),
        listDevices(accessToken),
        listEvents(accessToken),
        listScenarios(accessToken)
      ]);

      setHomes(nextHomes.map(mapHome));
      setRooms(nextRooms.map(mapRoom));
      setDevices(nextDevices.map(mapDevice));
      setDeviceEvents(sortEventsByNewest(nextEvents.map(mapEvent)));
      setScenarios(nextScenarios.map(mapScenario));
    } finally {
      setIsDataLoading(false);
    }
  }, []);

  const bootstrapDemoData = useCallback(async (accessToken: string) => {
    const demoHome = await createHome(accessToken, "My Home");
    const roomIdByKey = new Map<string, string>();

    for (const room of demoRooms) {
      const createdRoom = await createRoom(accessToken, room.name, demoHome.id);
      roomIdByKey.set(room.key, createdRoom.id);
    }

    const deviceIdByKey = new Map<string, string>();

    for (const device of demoDevices) {
      const roomId = roomIdByKey.get(device.roomKey);
      if (!roomId) {
        continue;
      }

      const createdDevice = await createDevice(accessToken, {
        name: device.name,
        type: device.type,
        roomId
      });

      deviceIdByKey.set(device.key, createdDevice.id);

      if (
        device.initialAction &&
        mapActionToStatus(device.initialAction) !== createdDevice.status
      ) {
        await applyDeviceAction(accessToken, {
          deviceId: createdDevice.id,
          action: device.initialAction
        });
      }
    }

    for (const scenario of demoScenarios) {
      const actions = scenario.actions
        .map((item) => {
          const deviceId = deviceIdByKey.get(item.deviceKey);
          if (!deviceId) {
            return null;
          }

          return {
            device_id: deviceId,
            action: item.action
          };
        })
        .filter((item): item is { device_id: string; action: DeviceAction } => item !== null);

      if (actions.length === 0) {
        continue;
      }

      await createScenario(accessToken, {
        name: scenario.name,
        description: scenario.description,
        actions
      });
    }
  }, []);

  const completeAuthentication = useCallback(
    async (
      tokens: SessionTokens,
      options?: { seedDemoData?: boolean; fallbackUser?: UserOut | null }
    ) => {
      setSessionTokens(tokens);
      setAuthStatus("loading");
      setAuthError(null);

      try {
        const [authContext, currentUser] = await Promise.all([
          getAuthContext(tokens.accessToken),
          getCurrentUser(tokens.accessToken)
        ]);

        setOwnerId(authContext.owner_id);
        setUser(currentUser);

        const existingHomes = await listHomes(tokens.accessToken);

        if (options?.seedDemoData || existingHomes.length === 0) {
          await bootstrapDemoData(tokens.accessToken);
        }

        await hydrateState(tokens.accessToken);
        setAuthStatus("authenticated");
      } catch (error) {
        // Compatibility mode for backends without /api/v1/auth-context and /api/v1/users/me.
        if (options?.fallbackUser) {
          setUser(options.fallbackUser);
          setOwnerId(null);
          setHomes([]);
          setRooms([]);
          setDevices([]);
          setDeviceEvents([]);
          setSceneEvents([]);
          setScenarios([]);
          setAuthStatus("authenticated");
          return;
        }

        clearSessionState();
        setAuthError(getErrorMessage(error, "Unable to start your session"));
      }
    },
    [bootstrapDemoData, clearSessionState, hydrateState, setSessionTokens]
  );

  const runWithSession = useCallback(
    async function executeWithSession<T>(operation: (accessToken: string) => Promise<T>): Promise<T> {
      const activeSession = sessionRef.current;

      if (!activeSession) {
        throw new Error("Please sign in again.");
      }

      try {
        return await operation(activeSession.accessToken);
      } catch (error) {
        if (!(error instanceof UnauthorizedError)) {
          throw error;
        }

        try {
          const refreshed = await refreshAccessToken({
            refresh_token: activeSession.refreshToken
          });

          const nextSession = {
            ...activeSession,
            accessToken: refreshed.access_token
          };

          setSessionTokens(nextSession);
          return await operation(nextSession.accessToken);
        } catch (refreshError) {
          clearSessionState();
          setAuthError("Session expired. Please sign in again.");
          throw refreshError;
        }
      }
    },
    [clearSessionState, setSessionTokens]
  );

  const login = useCallback(
    async (payload: LoginPayload) => {
      setIsAuthSubmitting(true);
      setAuthError(null);

      try {
        const tokens = await loginRequest(payload);
        const normalized = normalizeSession(tokens);
        const fallbackUser: UserOut | null =
          tokens.email && tokens.firstName && tokens.lastName
            ? {
                id: tokens.email,
                email: tokens.email,
                name: `${tokens.firstName} ${tokens.lastName}`.trim(),
                phone: null,
                role: tokens.role || "USER",
                is_active: true,
                created_at: new Date().toISOString()
              }
            : null;

        await completeAuthentication(normalized, { fallbackUser });
      } catch (error) {
        setAuthError(getErrorMessage(error, "Unable to sign in"));
      } finally {
        setIsAuthSubmitting(false);
      }
    },
    [completeAuthentication]
  );

  const register = useCallback(
    async (payload: RegisterPayload) => {
      if (payload.password !== payload.confirmPassword) {
        setAuthError("Passwords do not match");
        return;
      }

      if (!payload.phone.trim()) {
        setAuthError("Phone number is required");
        return;
      }

      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(payload.password)) {
        setAuthError("Password must be 8+ chars and include upper, lower, and number");
        return;
      }

      setIsAuthSubmitting(true);
      setAuthError(null);

      try {
        const registerResponse = await registerRequest(payload);
        const tokens = await loginRequest({
          email: payload.email,
          password: payload.password
        });
        const normalized = normalizeSession(tokens);
        const fallbackUser: UserOut = {
          id: registerResponse.id || payload.email,
          email: registerResponse.email || payload.email,
          name: registerResponse.name || payload.name,
          phone: registerResponse.phone ?? payload.phone,
          role: registerResponse.role || "USER",
          is_active: registerResponse.is_active ?? true,
          created_at: registerResponse.created_at || new Date().toISOString()
        };

        await completeAuthentication(normalized, { seedDemoData: true, fallbackUser });
      } catch (error) {
        setAuthError(getErrorMessage(error, "Unable to create your account"));
      } finally {
        setIsAuthSubmitting(false);
      }
    },
    [completeAuthentication]
  );

  const logout = useCallback(async () => {
    const activeSession = sessionRef.current;

    setIsAuthSubmitting(true);
    setAuthError(null);

    try {
      if (activeSession) {
        await logoutRequest(
          {
            refresh_token: activeSession.refreshToken
          },
          activeSession.accessToken
        );
      }
    } catch {
      // Logging out locally is still safe even if the request fails.
    } finally {
      clearSessionState();
      setIsAuthSubmitting(false);
    }
  }, [clearSessionState]);

  const refreshData = useCallback(async () => {
    try {
      await runWithSession(async (accessToken) => {
        await hydrateState(accessToken);
      });
    } catch (error) {
      Alert.alert("Sync failed", getErrorMessage(error, "Unable to refresh smart home data"));
    }
  }, [hydrateState, runWithSession]);

  const setDeviceStatus = useCallback(
    async (deviceId: string, nextStatus: DeviceStatus) => {
      const currentDevice = devices.find((item) => item.id === deviceId);

      if (!currentDevice || currentDevice.status === nextStatus) {
        return;
      }

      const action = resolveActionForStatus(currentDevice, nextStatus);

      try {
        const updatedDevice = await runWithSession((accessToken) =>
          applyDeviceAction(accessToken, {
            deviceId,
            action
          })
        );

        setDevices((prev) => mergeUpdatedDeviceList(prev, [mapDevice(updatedDevice)]));
        setDeviceEvents((prev) => sortEventsByNewest([buildDeviceEvent(deviceId, action), ...prev]));
      } catch (error) {
        Alert.alert("Control failed", getErrorMessage(error, "Unable to update the device"));
      }
    },
    [devices, runWithSession]
  );

  const toggleDevice = useCallback(
    async (deviceId: string) => {
      const device = devices.find((item) => item.id === deviceId);

      if (!device) {
        return;
      }

      const nextStatus =
        device.type === "DOOR" || device.type === "WINDOW"
          ? device.status === "OPEN"
            ? "CLOSED"
            : "OPEN"
          : device.status === "ON"
            ? "OFF"
            : "ON";

      await setDeviceStatus(deviceId, nextStatus);
    },
    [devices, setDeviceStatus]
  );

  const runScenario = useCallback(
    async (scenarioId: string): Promise<Scenario | null> => {
      const scenario = scenarios.find((item) => item.id === scenarioId);

      if (!scenario) {
        return null;
      }

      try {
        const result = await runWithSession((accessToken) => runScenarioRequest(accessToken, scenarioId));
        const updatedDevices = result.devices.map(mapDevice);
        const timestampBase = Date.now();

        setDevices((prev) => mergeUpdatedDeviceList(prev, updatedDevices));
        setSceneEvents((prev) => [buildSceneEvent(scenario), ...prev].slice(0, 20));
        setDeviceEvents((prev) =>
          sortEventsByNewest([
            ...updatedDevices.map((device, index) => {
              const action = scenario.actions.find((item) => item.device_id === device.id)?.action ?? "TURN_ON";
              return buildDeviceEvent(device.id, action, timestampBase + index);
            }),
            ...prev
          ])
        );

        return scenario;
      } catch (error) {
        Alert.alert("Scenario failed", getErrorMessage(error, "Unable to run the scenario"));
        return null;
      }
    },
    [runWithSession, scenarios]
  );

  const addHome = useCallback(
    async (name: string) => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return;
      }

      try {
        const home = await runWithSession((accessToken) => createHome(accessToken, trimmedName));
        setHomes((prev) => [mapHome(home), ...prev]);
      } catch (error) {
        Alert.alert("Create home failed", getErrorMessage(error, "Unable to create the home"));
      }
    },
    [runWithSession]
  );

  const addRoom = useCallback(
    async (name: string, homeId?: string) => {
      const trimmedName = name.trim();
      const selectedHomeId = homeId || homes[0]?.id;

      if (!trimmedName || !selectedHomeId) {
        return;
      }

      try {
        const room = await runWithSession((accessToken) =>
          createRoom(accessToken, trimmedName, selectedHomeId)
        );

        setRooms((prev) => [mapRoom(room), ...prev]);
      } catch (error) {
        Alert.alert("Create room failed", getErrorMessage(error, "Unable to create the room"));
      }
    },
    [homes, runWithSession]
  );

  const events = useMemo(
    () => sortEventsByNewest([...sceneEvents, ...deviceEvents]),
    [deviceEvents, sceneEvents]
  );

  const value = useMemo(
    () => ({
      authStatus,
      user,
      ownerId,
      authError,
      isAuthSubmitting,
      isDataLoading,
      homes,
      rooms,
      devices,
      events,
      scenarios,
      login,
      register,
      logout,
      refreshData,
      toggleDevice,
      setDeviceStatus,
      runScenario,
      addHome,
      addRoom
    }),
    [
      addHome,
      addRoom,
      authError,
      authStatus,
      devices,
      events,
      homes,
      isAuthSubmitting,
      isDataLoading,
      login,
      logout,
      ownerId,
      refreshData,
      register,
      rooms,
      runScenario,
      scenarios,
      setDeviceStatus,
      toggleDevice,
      user
    ]
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
