import { Ionicons } from "@expo/vector-icons";
import { OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import {
  RoomScene,
  clampIntensity,
  getRoomVariant,
  isOn,
  isOpen,
  pickByType,
} from "../components/RoomScene3D";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";

export function Room3DScreen() {
  const { devices, rooms, setDeviceStatus } = useSmartHome();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [localWindowOpen, setLocalWindowOpen] = useState(true);
  const [intensity, setIntensity] = useState(82);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );
  const selectedRoomIndex = useMemo(
    () => rooms.findIndex((room) => room.id === selectedRoom?.id),
    [rooms, selectedRoom?.id]
  );
  const roomVariant = useMemo(
    () => getRoomVariant(selectedRoom?.name, selectedRoomIndex),
    [selectedRoom?.name, selectedRoomIndex]
  );

  // Same live data pipeline as the mobile screen: device state arrives over the
  // WebSocket in SmartHomeContext, so toggles made on a phone show up here instantly.
  const lightDevice = useMemo(
    () => pickByType(devices, "LIGHT", selectedRoom?.id),
    [devices, selectedRoom?.id]
  );
  const doorDevice = useMemo(
    () => pickByType(devices, "DOOR", selectedRoom?.id),
    [devices, selectedRoom?.id]
  );
  const lightOn = isOn(lightDevice?.status);
  const doorOpen = isOpen(doorDevice?.status);
  const windowOpen = localWindowOpen;

  const toggleLight = useCallback(() => {
    if (!lightDevice) return;
    void setDeviceStatus(lightDevice.id, lightOn ? "OFF" : "ON");
  }, [lightDevice, lightOn, setDeviceStatus]);

  const toggleDoor = useCallback(() => {
    if (!doorDevice) return;
    void setDeviceStatus(doorDevice.id, doorOpen ? "CLOSED" : "OPEN");
  }, [doorDevice, doorOpen, setDeviceStatus]);

  const toggleWindow = useCallback(() => {
    setLocalWindowOpen((value) => !value);
  }, []);

  const switchAll = useCallback(
    (next: "ON" | "OFF") => {
      if (lightDevice) void setDeviceStatus(lightDevice.id, next);
      if (doorDevice) void setDeviceStatus(doorDevice.id, next === "ON" ? "OPEN" : "CLOSED");
      setLocalWindowOpen(next === "ON");
    },
    [doorDevice, lightDevice, setDeviceStatus]
  );

  const nudgeIntensity = useCallback((delta: number) => {
    setIntensity((value) => clampIntensity(value + delta));
  }, []);

  const activeCount = [lightOn, doorOpen, windowOpen].filter(Boolean).length;
  const roomName = selectedRoom?.name ?? "Living Room";

  return (
    <View style={[styles.root, lightOn && styles.rootLight]}>
      <View style={styles.canvasWrap}>
        <Canvas shadows camera={{ position: [5.5, 2.6, 5.5], fov: 38 }} dpr={[1, 2]}>
          <RoomScene
            lightOn={lightOn}
            doorOpen={doorOpen}
            windowOpen={windowOpen}
            intensity={intensity}
            onLightPress={toggleLight}
            onDoorPress={toggleDoor}
            onWindowPress={toggleWindow}
            variant={roomVariant}
          />
          <OrbitControls
            enablePan={false}
            minDistance={4.5}
            maxDistance={8}
            minPolarAngle={0.45}
            maxPolarAngle={1.45}
            autoRotate
            autoRotateSpeed={0.35}
          />
        </Canvas>
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.eyebrow}>ROOM / 3D / LIVE</Text>
              <Text style={styles.title}>{roomName}</Text>
            </View>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: activeCount > 0 ? colors.success : colors.ink400 }]} />
              <Text style={styles.badgeText}>{activeCount} ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.description}>
            Click the lamp or the door in the scene to control real devices. Changes made from your
            phone appear here live.
          </Text>

          {rooms.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
              {rooms.map((room) => {
                const active = room.id === (selectedRoom?.id ?? rooms[0]?.id);
                return (
                  <Pressable
                    key={room.id}
                    onPress={() => setSelectedRoomId(room.id)}
                    style={[styles.chip, active && styles.chipActive]}
                  >
                    <Text style={styles.roomEmoji}>{room.emoji}</Text>
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{room.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.deviceRow}>
            <DeviceChip
              icon="bulb-outline"
              label="Light"
              state={!lightDevice ? "N/A" : lightOn ? "ON" : "OFF"}
              active={lightOn}
              disabled={!lightDevice}
              onPress={toggleLight}
            />
            <DeviceChip
              icon="log-out-outline"
              label="Door"
              state={!doorDevice ? "N/A" : doorOpen ? "OPEN" : "LOCKED"}
              active={doorOpen}
              disabled={!doorDevice}
              onPress={toggleDoor}
            />
            <DeviceChip
              icon="partly-sunny-outline"
              label="Window"
              state={windowOpen ? "OPEN" : "CLOSED"}
              active={windowOpen}
              onPress={toggleWindow}
            />
          </View>

          {lightOn && (
            <View style={styles.intensityRow}>
              <Text style={styles.intensityLabel}>INTENSITY</Text>
              <Pressable style={styles.intensityStepButton} onPress={() => nudgeIntensity(-10)}>
                <Ionicons name="remove" size={14} color={colors.ink700} />
              </Pressable>
              <View style={styles.intensityTrack}>
                <View style={[styles.intensityFill, { width: `${intensity}%` }]} />
              </View>
              <Pressable style={styles.intensityStepButton} onPress={() => nudgeIntensity(10)}>
                <Ionicons name="add" size={14} color={colors.ink700} />
              </Pressable>
              <Text style={styles.intensityValue}>{intensity}%</Text>
            </View>
          )}

          <View style={styles.actionsRow}>
            <Pressable style={styles.allOnBtn} onPress={() => switchAll("ON")}>
              <Ionicons name="power" size={14} color="#fff" />
              <Text style={styles.allOnText}>Power on all</Text>
            </Pressable>
            <Pressable style={styles.allOffBtn} onPress={() => switchAll("OFF")}>
              <Ionicons name="power" size={14} color={colors.ink700} />
              <Text style={styles.allOffText}>Power off</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

function DeviceChip({
  icon,
  label,
  state,
  active,
  disabled,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  state: string;
  active: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.deviceChip, active && styles.deviceChipActive, disabled && styles.deviceChipDisabled]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.deviceChipIcon, active && styles.deviceChipIconActive]}>
        <Ionicons name={icon} size={13} color={active ? "#fff" : colors.ink700} />
      </View>
      <Text style={styles.deviceChipLabel}>{label}</Text>
      <Text style={[styles.deviceChipState, active && styles.deviceChipStateActive]}>{state}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0e1218"
  },
  rootLight: {
    backgroundColor: "#dbe3ee"
  },
  canvasWrap: {
    flex: 1
  },
  overlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingBottom: 16
  },
  panel: {
    borderRadius: 24,
    padding: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(209, 213, 219, 0.8)"
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12
  },
  headerLeft: {
    flex: 1,
    gap: 2
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "600",
    color: colors.ink500,
    letterSpacing: 1.1
  },
  title: {
    marginTop: 4,
    color: colors.ink900,
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: -0.5
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.border
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 999
  },
  badgeText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: colors.ink900,
    letterSpacing: 0.8
  },
  description: {
    marginTop: 8,
    color: colors.ink600,
    fontSize: 13,
    lineHeight: 18
  },
  chipRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
    paddingRight: 16
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.border
  },
  chipActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent
  },
  roomEmoji: {
    fontSize: 13
  },
  chipText: {
    color: colors.ink700,
    fontSize: 12,
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#fff"
  },
  deviceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12
  },
  deviceChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.border
  },
  deviceChipActive: {
    borderColor: colors.accent
  },
  deviceChipDisabled: {
    opacity: 0.5
  },
  deviceChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(11,13,18,0.08)"
  },
  deviceChipIconActive: {
    backgroundColor: colors.accent
  },
  deviceChipLabel: {
    color: colors.ink900,
    fontSize: 12,
    fontWeight: "500"
  },
  deviceChipState: {
    fontFamily: "monospace",
    color: colors.ink500,
    fontSize: 10.5,
    fontWeight: "600"
  },
  deviceChipStateActive: {
    color: colors.accent
  },
  intensityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12
  },
  intensityLabel: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink700,
    letterSpacing: 1.2
  },
  intensityStepButton: {
    width: 26,
    height: 26,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.border
  },
  intensityTrack: {
    flex: 1,
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11,13,18,0.15)",
    overflow: "hidden"
  },
  intensityFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  intensityValue: {
    fontFamily: "monospace",
    fontSize: 12,
    color: colors.ink900,
    fontWeight: "700",
    minWidth: 38,
    textAlign: "right"
  },
  actionsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14
  },
  allOnBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.accent
  },
  allOnText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600"
  },
  allOffBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 999,
    backgroundColor: colors.cream50,
    borderWidth: 1,
    borderColor: colors.border
  },
  allOffText: {
    color: colors.ink700,
    fontSize: 13,
    fontWeight: "600"
  }
});
