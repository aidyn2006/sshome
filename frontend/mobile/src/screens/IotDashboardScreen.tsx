import { Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  ImageBackground,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import { createSeedState } from "../mock/iotSeed";
import type {
  Device,
  DeviceAction,
  DeviceStatus,
  DeviceType,
  EventAction,
  EventSource,
  Home,
  IoTEvent,
  Room,
  Scenario,
  ScenarioActionItem
} from "../types/iot";

type Props = {
  ownerId: string;
  ownerLabel: string;
  onLogout: () => void;
};

const DEVICE_TYPES: DeviceType[] = ["LIGHT", "DOOR", "AC", "TEMP"];

const DEVICE_ICONS: Record<DeviceType, keyof typeof Ionicons.glyphMap> = {
  LIGHT: "bulb-outline",
  DOOR: "exit-outline",
  AC: "snow-outline",
  TEMP: "thermometer-outline"
};

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

function mapActionToStatus(action: DeviceAction): DeviceStatus {
  switch (action) {
    case "TURN_ON":
      return "ON";
    case "TURN_OFF":
      return "OFF";
    case "OPEN":
      return "OPEN";
    case "CLOSE":
      return "CLOSE";
  }
}

function mapActionToEvent(action: DeviceAction): EventAction {
  switch (action) {
    case "TURN_ON":
      return "ON";
    case "TURN_OFF":
      return "OFF";
    case "OPEN":
      return "OPEN";
    case "CLOSE":
      return "CLOSE";
  }
}

function getAllowedActions(deviceType: DeviceType): DeviceAction[] {
  if (deviceType === "DOOR") {
    return ["OPEN", "CLOSE"];
  }

  return ["TURN_ON", "TURN_OFF"];
}

function getInitialStatus(deviceType: DeviceType): DeviceStatus {
  if (deviceType === "DOOR") {
    return "CLOSE";
  }

  return "OFF";
}

function isNoOp(device: Device, action: DeviceAction): boolean {
  return device.status === mapActionToStatus(action);
}

function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString();
}

function resolveDisplayName(ownerLabel: string): string {
  if (!ownerLabel.trim()) {
    return "Owner";
  }

  const [beforeAt] = ownerLabel.split("@");
  if (!beforeAt || beforeAt.length < 2) {
    return ownerLabel;
  }

  return beforeAt.charAt(0).toUpperCase() + beforeAt.slice(1);
}

export function IotDashboardScreen({ ownerId, ownerLabel, onLogout }: Props) {
  const seed = useMemo(() => createSeedState(ownerId), [ownerId]);

  const [homes, setHomes] = useState<Home[]>(seed.homes);
  const [rooms, setRooms] = useState<Room[]>(seed.rooms);
  const [devices, setDevices] = useState<Device[]>(seed.devices);
  const [events, setEvents] = useState<IoTEvent[]>(seed.events);
  const [scenarios, setScenarios] = useState<Scenario[]>(seed.scenarios);

  const [selectedHomeId, setSelectedHomeId] = useState<string | null>(seed.homes[0]?.id ?? null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(
    seed.rooms.find((room) => room.homeId === seed.homes[0]?.id)?.id ?? null
  );

  const [newHomeName, setNewHomeName] = useState("");
  const [newRoomName, setNewRoomName] = useState("");
  const [newDeviceName, setNewDeviceName] = useState("");
  const [newDeviceType, setNewDeviceType] = useState<DeviceType>("LIGHT");

  const [newScenarioName, setNewScenarioName] = useState("");
  const [newScenarioDescription, setNewScenarioDescription] = useState("");
  const [scenarioDeviceId, setScenarioDeviceId] = useState<string>("");
  const [scenarioAction, setScenarioAction] = useState<DeviceAction>("TURN_OFF");
  const [draftScenarioActions, setDraftScenarioActions] = useState<ScenarioActionItem[]>([]);

  useEffect(() => {
    setHomes(seed.homes);
    setRooms(seed.rooms);
    setDevices(seed.devices);
    setEvents(seed.events);
    setScenarios(seed.scenarios);

    const firstHomeId = seed.homes[0]?.id ?? null;
    setSelectedHomeId(firstHomeId);
    setSelectedRoomId(seed.rooms.find((room) => room.homeId === firstHomeId)?.id ?? null);
  }, [seed]);

  const ownerHomes = useMemo(() => homes.filter((home) => home.ownerId === ownerId), [homes, ownerId]);

  useEffect(() => {
    if (ownerHomes.length === 0) {
      setSelectedHomeId(null);
      return;
    }

    if (!selectedHomeId || !ownerHomes.some((home) => home.id === selectedHomeId)) {
      setSelectedHomeId(ownerHomes[0].id);
    }
  }, [ownerHomes, selectedHomeId]);

  const homeRooms = useMemo(
    () => rooms.filter((room) => room.homeId === selectedHomeId),
    [rooms, selectedHomeId]
  );

  useEffect(() => {
    if (homeRooms.length === 0) {
      setSelectedRoomId(null);
      return;
    }

    if (!selectedRoomId || !homeRooms.some((room) => room.id === selectedRoomId)) {
      setSelectedRoomId(homeRooms[0].id);
    }
  }, [homeRooms, selectedRoomId]);

  const homeRoomIds = useMemo(() => new Set(homeRooms.map((room) => room.id)), [homeRooms]);

  const homeDevices = useMemo(
    () =>
      devices.filter(
        (device) => device.ownerId === ownerId && homeRoomIds.has(device.roomId)
      ),
    [devices, ownerId, homeRoomIds]
  );

  const visibleDevices = useMemo(() => {
    if (!selectedRoomId) {
      return homeDevices;
    }

    return homeDevices.filter((device) => device.roomId === selectedRoomId);
  }, [homeDevices, selectedRoomId]);

  const ownerScenarios = useMemo(
    () => scenarios.filter((scenario) => scenario.ownerId === ownerId),
    [scenarios, ownerId]
  );

  const ownerEvents = useMemo(() => events.filter((event) => event.ownerId === ownerId), [events, ownerId]);

  const deviceNameById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.name])),
    [devices]
  );

  const scenarioDeviceOptions = homeDevices;

  useEffect(() => {
    if (scenarioDeviceOptions.length === 0) {
      setScenarioDeviceId("");
      return;
    }

    if (!scenarioDeviceId || !scenarioDeviceOptions.some((device) => device.id === scenarioDeviceId)) {
      setScenarioDeviceId(scenarioDeviceOptions[0].id);
    }
  }, [scenarioDeviceOptions, scenarioDeviceId]);

  const scenarioActionOptions = useMemo(() => {
    const targetDevice = scenarioDeviceOptions.find((device) => device.id === scenarioDeviceId);
    if (!targetDevice) {
      return [];
    }

    return getAllowedActions(targetDevice.type);
  }, [scenarioDeviceOptions, scenarioDeviceId]);

  useEffect(() => {
    if (scenarioActionOptions.length === 0) {
      return;
    }

    if (!scenarioActionOptions.includes(scenarioAction)) {
      setScenarioAction(scenarioActionOptions[0]);
    }
  }, [scenarioActionOptions, scenarioAction]);

  function appendEvent(deviceId: string, action: EventAction, source: EventSource) {
    const newEvent: IoTEvent = {
      id: generateId("evt"),
      deviceId,
      action,
      timestamp: new Date().toISOString(),
      ownerId,
      source
    };

    setEvents((prev) => [newEvent, ...prev].slice(0, 300));
  }

  function applyManualDeviceAction(deviceId: string, action: DeviceAction, source: EventSource): boolean {
    const targetDevice = devices.find((device) => device.id === deviceId && device.ownerId === ownerId);
    if (!targetDevice) {
      return false;
    }

    if (!getAllowedActions(targetDevice.type).includes(action)) {
      return false;
    }

    const nextStatus = mapActionToStatus(action);
    if (targetDevice.status === nextStatus) {
      return false;
    }

    setDevices((prev) =>
      prev.map((device) =>
        device.id === deviceId
          ? {
              ...device,
              status: nextStatus
            }
          : device
      )
    );
    appendEvent(deviceId, mapActionToEvent(action), source);
    return true;
  }

  function handleCreateHome() {
    if (!newHomeName.trim()) {
      Alert.alert("Validation", "Home name is required.");
      return;
    }

    const home: Home = {
      id: generateId("home"),
      name: newHomeName.trim(),
      ownerId
    };

    setHomes((prev) => [home, ...prev]);
    setSelectedHomeId(home.id);
    setNewHomeName("");
  }

  function handleCreateRoom() {
    if (!selectedHomeId) {
      Alert.alert("Validation", "Create or select a home first.");
      return;
    }

    if (!newRoomName.trim()) {
      Alert.alert("Validation", "Room name is required.");
      return;
    }

    const room: Room = {
      id: generateId("room"),
      name: newRoomName.trim(),
      homeId: selectedHomeId
    };

    setRooms((prev) => [room, ...prev]);
    setSelectedRoomId(room.id);
    setNewRoomName("");
  }

  function handleCreateDevice() {
    if (!selectedRoomId) {
      Alert.alert("Validation", "Create or select a room first.");
      return;
    }

    if (!newDeviceName.trim()) {
      Alert.alert("Validation", "Device name is required.");
      return;
    }

    const device: Device = {
      id: generateId("dev"),
      name: newDeviceName.trim(),
      type: newDeviceType,
      status: getInitialStatus(newDeviceType),
      roomId: selectedRoomId,
      ownerId
    };

    setDevices((prev) => [device, ...prev]);
    setNewDeviceName("");
  }

  function handleManualAction(deviceId: string, action: DeviceAction) {
    applyManualDeviceAction(deviceId, action, "MANUAL");
  }

  function handleAddScenarioAction() {
    if (!scenarioDeviceId) {
      Alert.alert("Validation", "Choose a device for scenario action.");
      return;
    }

    setDraftScenarioActions((prev) => [
      ...prev,
      {
        deviceId: scenarioDeviceId,
        action: scenarioAction
      }
    ]);
  }

  function handleCreateScenario() {
    if (!newScenarioName.trim()) {
      Alert.alert("Validation", "Scenario name is required.");
      return;
    }

    if (draftScenarioActions.length === 0) {
      Alert.alert("Validation", "Add at least one action to the scenario.");
      return;
    }

    const scenario: Scenario = {
      id: generateId("scenario"),
      name: newScenarioName.trim(),
      description: newScenarioDescription.trim(),
      actions: draftScenarioActions,
      ownerId
    };

    setScenarios((prev) => [scenario, ...prev]);
    setNewScenarioName("");
    setNewScenarioDescription("");
    setDraftScenarioActions([]);
  }

  function handleRunScenario(scenarioId: string) {
    const scenario = ownerScenarios.find((item) => item.id === scenarioId);
    if (!scenario) {
      return;
    }

    const deviceMap = new Map(devices.map((device) => [device.id, { ...device }]));
    const plannedEvents: IoTEvent[] = [];
    const finalStatusMap = new Map<string, DeviceStatus>();

    scenario.actions.forEach((item) => {
      const targetDevice = deviceMap.get(item.deviceId);
      if (!targetDevice || targetDevice.ownerId !== ownerId) {
        return;
      }

      if (!getAllowedActions(targetDevice.type).includes(item.action)) {
        return;
      }

      const nextStatus = mapActionToStatus(item.action);
      if (targetDevice.status === nextStatus) {
        return;
      }

      targetDevice.status = nextStatus;
      finalStatusMap.set(item.deviceId, nextStatus);

      plannedEvents.push({
        id: generateId("evt"),
        deviceId: item.deviceId,
        action: mapActionToEvent(item.action),
        timestamp: new Date().toISOString(),
        ownerId,
        source: "SCENARIO"
      });
    });

    if (plannedEvents.length === 0) {
      Alert.alert("Scenario completed", `No applicable actions in ${scenario.name}.`);
      return;
    }

    setDevices((prev) =>
      prev.map((device) => {
        const nextStatus = finalStatusMap.get(device.id);
        if (!nextStatus) {
          return device;
        }

        return {
          ...device,
          status: nextStatus
        };
      })
    );

    setEvents((prev) => [...plannedEvents.reverse(), ...prev].slice(0, 300));

    Alert.alert("Scenario completed", `Applied ${plannedEvents.length} action(s) in ${scenario.name}.`);
  }

  function getRoomName(roomId: string): string {
    return rooms.find((room) => room.id === roomId)?.name ?? "Unknown room";
  }

  const displayName = resolveDisplayName(ownerLabel);

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={[styles.card, styles.heroCard]}>
        <View style={styles.glow} />
        <ImageBackground
          source={{
            uri: "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1600&q=80"
          }}
          resizeMode="cover"
          style={styles.banner}
          imageStyle={styles.bannerImage}
        >
          <View style={styles.bannerMask} />
        </ImageBackground>

        <View style={styles.content}>
          <View style={styles.heroHeaderRow}>
            <View>
              <Text style={styles.appLabel}>SSHome IoT Control</Text>
              <Text style={styles.title}>Welcome, {displayName}</Text>
              <Text style={styles.subtitle}>
                Event-driven control: Home - Rooms - Devices - Events - Scenarios
              </Text>
            </View>
            <View style={styles.logoCircle}>
              <Ionicons name="home" size={28} color="#3b82f6" />
            </View>
          </View>

          <Pressable style={styles.secondaryButton} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={16} color="#2563eb" />
            <Text style={styles.secondaryButtonText}>Sign Out</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Homes</Text>
          <Text style={styles.sectionHint}>Owner scope: {ownerId}</Text>
        </View>

        <View style={styles.chipsWrap}>
          {ownerHomes.map((home) => (
            <Pressable
              key={home.id}
              style={[styles.chip, selectedHomeId === home.id && styles.chipActive]}
              onPress={() => setSelectedHomeId(home.id)}
            >
              <Text style={[styles.chipText, selectedHomeId === home.id && styles.chipTextActive]}>
                {home.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={newHomeName}
            onChangeText={setNewHomeName}
            placeholder="New home name"
            placeholderTextColor="#9ca3af"
            style={styles.inputGrow}
          />
          <Pressable style={styles.smallPrimaryButton} onPress={handleCreateHome}>
            <Text style={styles.smallPrimaryButtonText}>Add</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Rooms</Text>

        {selectedHomeId ? (
          <>
            <View style={styles.chipsWrap}>
              {homeRooms.map((room) => (
                <Pressable
                  key={room.id}
                  style={[styles.chip, selectedRoomId === room.id && styles.chipActive]}
                  onPress={() => setSelectedRoomId(room.id)}
                >
                  <Text style={[styles.chipText, selectedRoomId === room.id && styles.chipTextActive]}>
                    {room.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.inputRow}>
              <TextInput
                value={newRoomName}
                onChangeText={setNewRoomName}
                placeholder="New room name"
                placeholderTextColor="#9ca3af"
                style={styles.inputGrow}
              />
              <Pressable style={styles.smallPrimaryButton} onPress={handleCreateRoom}>
                <Text style={styles.smallPrimaryButtonText}>Add</Text>
              </Pressable>
            </View>
          </>
        ) : (
          <Text style={styles.emptyText}>Create a home to continue.</Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Devices</Text>
          <Text style={styles.sectionHint}>Control actions create events automatically</Text>
        </View>

        <Text style={styles.label}>Device type</Text>
        <View style={styles.chipsWrap}>
          {DEVICE_TYPES.map((type) => (
            <Pressable
              key={type}
              style={[styles.chip, newDeviceType === type && styles.chipActive]}
              onPress={() => setNewDeviceType(type)}
            >
              <Text style={[styles.chipText, newDeviceType === type && styles.chipTextActive]}>{type}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.inputRow}>
          <TextInput
            value={newDeviceName}
            onChangeText={setNewDeviceName}
            placeholder="New device name"
            placeholderTextColor="#9ca3af"
            style={styles.inputGrow}
          />
          <Pressable style={styles.smallPrimaryButton} onPress={handleCreateDevice}>
            <Text style={styles.smallPrimaryButtonText}>Add</Text>
          </Pressable>
        </View>

        <View style={styles.devicesList}>
          {visibleDevices.map((device) => {
            const allowedActions = getAllowedActions(device.type);
            return (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceHeader}>
                  <View style={styles.deviceIdentity}>
                    <Ionicons name={DEVICE_ICONS[device.type]} size={20} color="#2563eb" />
                    <View>
                      <Text style={styles.deviceName}>{device.name}</Text>
                      <Text style={styles.deviceMeta}>
                        {device.type} - {getRoomName(device.roomId)}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.statusBadge,
                      (device.status === "ON" || device.status === "OPEN") && styles.statusBadgeOn
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        (device.status === "ON" || device.status === "OPEN") && styles.statusTextOn
                      ]}
                    >
                      {device.status}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionRow}>
                  {allowedActions.map((action) => {
                    const disabled = isNoOp(device, action);
                    return (
                      <Pressable
                        key={action}
                        style={[styles.actionButton, disabled && styles.actionButtonDisabled]}
                        disabled={disabled}
                        onPress={() => handleManualAction(device.id, action)}
                      >
                        <Text style={[styles.actionButtonText, disabled && styles.actionButtonTextDisabled]}>
                          {action}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </View>

        {visibleDevices.length === 0 && <Text style={styles.emptyText}>No devices in this room yet.</Text>}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Scenarios</Text>
          <Text style={styles.sectionHint}>Scenario actions are stored as JSON-like arrays</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Scenario name</Text>
          <TextInput
            value={newScenarioName}
            onChangeText={setNewScenarioName}
            placeholder="Away Mode"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={newScenarioDescription}
            onChangeText={setNewScenarioDescription}
            placeholder="Turn off lights and close doors"
            placeholderTextColor="#9ca3af"
            style={styles.input}
          />
        </View>

        <Text style={styles.label}>Pick device</Text>
        <View style={styles.chipsWrap}>
          {scenarioDeviceOptions.map((device) => (
            <Pressable
              key={device.id}
              style={[styles.chip, scenarioDeviceId === device.id && styles.chipActive]}
              onPress={() => setScenarioDeviceId(device.id)}
            >
              <Text style={[styles.chipText, scenarioDeviceId === device.id && styles.chipTextActive]}>
                {device.name}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>Pick action</Text>
        <View style={styles.chipsWrap}>
          {scenarioActionOptions.map((actionOption) => (
            <Pressable
              key={actionOption}
              style={[styles.chip, scenarioAction === actionOption && styles.chipActive]}
              onPress={() => setScenarioAction(actionOption)}
            >
              <Text style={[styles.chipText, scenarioAction === actionOption && styles.chipTextActive]}>
                {actionOption}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.secondaryButton} onPress={handleAddScenarioAction}>
          <Ionicons name="add-circle-outline" size={16} color="#2563eb" />
          <Text style={styles.secondaryButtonText}>Add action to draft</Text>
        </Pressable>

        <View style={styles.draftActionsWrap}>
          {draftScenarioActions.map((item, index) => (
            <Pressable
              key={`${item.deviceId}-${item.action}-${index}`}
              style={styles.draftActionChip}
              onPress={() =>
                setDraftScenarioActions((prev) => prev.filter((_, itemIndex) => itemIndex !== index))
              }
            >
              <Text style={styles.draftActionText}>
                {deviceNameById.get(item.deviceId) ?? "Unknown"} - {item.action}
              </Text>
              <Ionicons name="close" size={14} color="#374151" />
            </Pressable>
          ))}
        </View>

        <Pressable style={styles.submitButton} onPress={handleCreateScenario}>
          <Text style={styles.submitButtonText}>Create Scenario</Text>
        </Pressable>

        <View style={styles.scenarioList}>
          {ownerScenarios.map((scenario) => (
            <View key={scenario.id} style={styles.scenarioCard}>
              <View style={styles.scenarioTopRow}>
                <View>
                  <Text style={styles.scenarioName}>{scenario.name}</Text>
                  <Text style={styles.scenarioDescription}>{scenario.description || "No description"}</Text>
                </View>
                <Pressable style={styles.smallPrimaryButton} onPress={() => handleRunScenario(scenario.id)}>
                  <Text style={styles.smallPrimaryButtonText}>Run</Text>
                </Pressable>
              </View>

              <Text style={styles.scenarioMeta}>Actions: {scenario.actions.length}</Text>
            </View>
          ))}
        </View>
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Events</Text>
          <Text style={styles.sectionHint}>Every device action is logged</Text>
        </View>

        <View style={styles.eventsList}>
          {ownerEvents.slice(0, 16).map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View style={styles.eventMain}>
                <Text style={styles.eventAction}>{event.action}</Text>
                <Text style={styles.eventText}>{deviceNameById.get(event.deviceId) ?? "Unknown device"}</Text>
              </View>
              <View style={styles.eventMetaBlock}>
                <Text style={styles.eventSource}>{event.source}</Text>
                <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>

        {ownerEvents.length === 0 && <Text style={styles.emptyText}>No events yet.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: 16,
    gap: 14,
    paddingBottom: 36
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#0f172a",
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 18,
    elevation: 6,
    padding: 16,
    gap: 10
  },
  heroCard: {
    padding: 0,
    gap: 0
  },
  glow: {
    position: "absolute",
    top: -30,
    left: 24,
    right: 24,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(96,165,250,0.22)",
    zIndex: 0
  },
  banner: {
    height: 96,
    justifyContent: "flex-end"
  },
  bannerImage: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  bannerMask: {
    height: 58,
    backgroundColor: "rgba(255,255,255,0.68)"
  },
  content: {
    padding: 16,
    gap: 12
  },
  heroHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12
  },
  appLabel: {
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 4
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    marginTop: 4,
    color: "#6b7280",
    maxWidth: 230
  },
  logoCircle: {
    width: 58,
    height: 58,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#93c5fd",
    shadowOpacity: 0.35,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 4
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827"
  },
  sectionHint: {
    color: "#64748b",
    fontSize: 12,
    maxWidth: 180,
    textAlign: "right"
  },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderWidth: 1,
    borderColor: "#dbe2ee",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999
  },
  chipActive: {
    backgroundColor: "#dbeafe",
    borderColor: "#93c5fd"
  },
  chipText: {
    color: "#374151",
    fontWeight: "600",
    fontSize: 12
  },
  chipTextActive: {
    color: "#1d4ed8"
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  inputGrow: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    height: 46,
    paddingHorizontal: 12,
    color: "#111827"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    height: 48,
    paddingHorizontal: 12,
    color: "#111827"
  },
  field: {
    gap: 6
  },
  label: {
    color: "#374151",
    fontWeight: "600"
  },
  smallPrimaryButton: {
    height: 46,
    borderRadius: 12,
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  smallPrimaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13
  },
  secondaryButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#bfdbfe",
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    height: 40,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  secondaryButtonText: {
    color: "#2563eb",
    fontWeight: "700"
  },
  devicesList: {
    gap: 10
  },
  deviceCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fbfdff",
    borderRadius: 14,
    padding: 12,
    gap: 10
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  deviceIdentity: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    flex: 1
  },
  deviceName: {
    color: "#111827",
    fontWeight: "700"
  },
  deviceMeta: {
    color: "#6b7280",
    fontSize: 12
  },
  statusBadge: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    backgroundColor: "#f8fafc",
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  statusBadgeOn: {
    borderColor: "#86efac",
    backgroundColor: "#dcfce7"
  },
  statusText: {
    color: "#334155",
    fontWeight: "700",
    fontSize: 11
  },
  statusTextOn: {
    color: "#166534"
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap"
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#2563eb"
  },
  actionButtonDisabled: {
    backgroundColor: "#d1d5db"
  },
  actionButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 12
  },
  actionButtonTextDisabled: {
    color: "#4b5563"
  },
  draftActionsWrap: {
    gap: 8
  },
  draftActionChip: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  draftActionText: {
    color: "#374151",
    fontWeight: "600",
    flex: 1,
    fontSize: 12
  },
  submitButton: {
    marginTop: 2,
    backgroundColor: "#2563eb",
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  submitButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15
  },
  scenarioList: {
    marginTop: 2,
    gap: 10
  },
  scenarioCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#fbfdff",
    borderRadius: 14,
    padding: 12,
    gap: 8
  },
  scenarioTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10
  },
  scenarioName: {
    fontWeight: "700",
    color: "#111827"
  },
  scenarioDescription: {
    color: "#6b7280",
    fontSize: 12,
    maxWidth: 210
  },
  scenarioMeta: {
    color: "#374151",
    fontSize: 12,
    fontWeight: "600"
  },
  eventsList: {
    gap: 8
  },
  eventRow: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    paddingHorizontal: 10,
    paddingVertical: 9,
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10
  },
  eventMain: {
    flex: 1,
    gap: 2
  },
  eventAction: {
    color: "#2563eb",
    fontWeight: "700",
    fontSize: 12
  },
  eventText: {
    color: "#374151"
  },
  eventMetaBlock: {
    alignItems: "flex-end",
    gap: 2
  },
  eventSource: {
    color: "#475569",
    fontWeight: "700",
    fontSize: 11
  },
  eventTime: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "right",
    maxWidth: 120
  },
  emptyText: {
    color: "#6b7280"
  }
});
