import { Ionicons } from "@expo/vector-icons";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as THREE from "three";

import { AppPressable } from "../components/AppPressable";
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

/**
 * Web room view — real WebGL 3D (react-three-fiber), sharing the exact same
 * `RoomScene` geometry as the native screen. Drag to orbit, contact shadows +
 * directional shadow maps for depth, ACES tone mapping for a polished look.
 */
export function Room3DScreen() {
  const insets = useSafeAreaInsets();
  const { devices, rooms, setDeviceStatus } = useSmartHome();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [localWindowOpen, setLocalWindowOpen] = useState(true);
  const [intensity, setIntensity] = useState(82);
  const [trackWidth, setTrackWidth] = useState(0);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );
  const selectedRoomIndex = useMemo(
    () => rooms.findIndex((room) => room.id === selectedRoom?.id),
    [rooms, selectedRoom?.id]
  );
  const roomVariant = useMemo(
    () => getRoomVariant(selectedRoom?.name, Math.max(selectedRoomIndex, 0)),
    [selectedRoom?.name, selectedRoomIndex]
  );

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

  const activeCount = [lightOn, doorOpen, windowOpen].filter(Boolean).length;
  const roomName = selectedRoom?.name ?? "Living Room";
  const knobLeft = trackWidth > 0 ? Math.max(0, Math.min(trackWidth - 22, ((trackWidth - 22) * intensity) / 100)) : 0;
  const fillWidth = trackWidth > 0 ? (trackWidth * intensity) / 100 : 0;

  const updateIntensityFromX = useCallback(
    (x: number) => {
      if (trackWidth <= 0) return;
      setIntensity(clampIntensity((x / trackWidth) * 100));
    },
    [trackWidth]
  );

  const intensityPanResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event) => updateIntensityFromX(event.nativeEvent.locationX),
        onPanResponderMove: (event) => updateIntensityFromX(event.nativeEvent.locationX),
      }),
    [updateIntensityFromX]
  );

  const nudgeIntensity = useCallback((delta: number) => {
    setIntensity((value) => clampIntensity(value + delta));
  }, []);

  return (
    <View style={[styles.root, lightOn && styles.rootLight]}>
      <View style={styles.canvas}>
        <Canvas
          shadows="percentage"
          dpr={[1, 2]}
          camera={{ position: [5.5, 2.6, 5.5], fov: 38 }}
          gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        >
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
          <ContactShadows
            position={[0, -0.54, 0]}
            scale={13}
            far={4.5}
            blur={2.6}
            resolution={512}
            opacity={lightOn ? 0.38 : 0.55}
            color="#05070d"
          />
          <OrbitControls
            makeDefault
            enablePan={false}
            target={[0, 0.6, 0]}
            minDistance={4.5}
            maxDistance={9}
            minPolarAngle={0.35}
            maxPolarAngle={1.45}
            enableDamping
            dampingFactor={0.08}
            autoRotate
            autoRotateSpeed={0.45}
          />
        </Canvas>
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={lightOn ? ["rgba(219,227,238,0.9)", "rgba(219,227,238,0)"] : ["rgba(14,18,24,0.9)", "rgba(14,18,24,0)"]}
        style={styles.topFade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={lightOn ? ["rgba(169,183,200,0)", "rgba(169,183,200,0.92)"] : ["rgba(6,8,16,0)", "rgba(6,8,16,0.95)"]}
        style={styles.bottomFade}
      />

      <View pointerEvents="box-none" style={[styles.topHud, { paddingTop: insets.top + 12 }]}>
        <View style={styles.hudHeader}>
          <View style={styles.hudHeaderLeft}>
            <Text style={[styles.hudEyebrow, lightOn && styles.hudEyebrowLight]}>ROOM / 3D / LIVE</Text>
            <Text style={[styles.hudTitle, lightOn && styles.hudTitleLight]}>{roomName}</Text>
          </View>
          <View style={[styles.hudBadge, lightOn && styles.hudBadgeLight]}>
            <View style={[styles.hudDot, { backgroundColor: activeCount > 0 ? colors.success : colors.ink400 }]} />
            <Text style={[styles.hudBadgeText, lightOn && styles.hudBadgeTextLight]}>{activeCount} ACTIVE</Text>
          </View>
        </View>

        {rooms.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.roomPicker}
          >
            {rooms.map((room) => {
              const active = room.id === (selectedRoom?.id ?? rooms[0]?.id);
              return (
                <AppPressable
                  key={room.id}
                  onPress={() => setSelectedRoomId(room.id)}
                  style={[
                    styles.roomChip,
                    lightOn && styles.roomChipLight,
                    active && (lightOn ? styles.roomChipActiveLight : styles.roomChipActive),
                  ]}
                >
                  <Text style={styles.roomEmoji}>{room.emoji}</Text>
                  <Text
                    style={[
                      styles.roomChipText,
                      lightOn && styles.roomChipTextLight,
                      active && (lightOn ? styles.roomChipTextActiveLight : styles.roomChipTextActive),
                    ]}
                  >
                    {room.name}
                  </Text>
                </AppPressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.chipRow} pointerEvents="auto">
          <HudChip
            icon="bulb-outline"
            label="Light"
            state={!lightDevice ? "N/A" : lightOn ? `${intensity}%` : "OFF"}
            active={lightOn}
            light={lightOn}
            onPress={toggleLight}
          />
          <HudChip
            icon="log-out-outline"
            label="Door"
            state={!doorDevice ? "N/A" : doorOpen ? "OPEN" : "LOCKED"}
            active={doorOpen}
            light={lightOn}
            onPress={toggleDoor}
          />
          <HudChip
            icon="partly-sunny-outline"
            label="Window"
            state={windowOpen ? "OPEN" : "CLOSED"}
            active={windowOpen}
            light={lightOn}
            onPress={toggleWindow}
          />
        </View>
      </View>

      <View pointerEvents="none" style={styles.dragHintWrap}>
        <Ionicons name="sync-outline" size={12} color={lightOn ? "rgba(11,13,18,0.45)" : "rgba(244,245,247,0.5)"} />
        <Text style={[styles.dragHint, lightOn && styles.dragHintLight]}>DRAG TO ROTATE</Text>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}>
        {lightOn && (
          <View style={styles.intensityCard}>
            <View style={styles.intensityHeader}>
              <Text style={styles.intensityLabel}>INTENSITY</Text>
              <Text style={styles.intensityValue}>
                {intensity}
                <Text style={styles.intensityUnit}>%</Text>
              </Text>
            </View>
            <View style={styles.intensityControlRow}>
              <AppPressable style={styles.intensityStepButton} onPress={() => nudgeIntensity(-10)} hitSlop={8}>
                <Ionicons name="remove" size={16} color={colors.ink700} />
              </AppPressable>

              <View
                style={styles.intensityTrackTouch}
                onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width)}
                {...intensityPanResponder.panHandlers}
              >
                <View style={styles.intensityTrack}>
                  <View style={[styles.intensityFill, { width: fillWidth }]} />
                  <View style={[styles.intensityKnob, { left: knobLeft }]} />
                </View>
              </View>

              <AppPressable style={styles.intensityStepButton} onPress={() => nudgeIntensity(10)} hitSlop={8}>
                <Ionicons name="add" size={16} color={colors.ink700} />
              </AppPressable>
            </View>
            <Text style={styles.intensityHint}>Drag the bar or use − / +</Text>
          </View>
        )}

        <View style={styles.panelActions}>
          <AppPressable style={styles.allOnBtn} onPress={() => switchAll("ON")}>
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.allOnText}>Power on all</Text>
          </AppPressable>
          <AppPressable style={[styles.allOffBtn, !lightOn && styles.allOffBtnDark]} onPress={() => switchAll("OFF")}>
            <Ionicons name="power" size={16} color={lightOn ? colors.ink700 : colors.cream50} />
            <Text style={[styles.allOffText, !lightOn && styles.allOffTextDark]}>Power off</Text>
          </AppPressable>
        </View>
      </View>
    </View>
  );
}

function HudChip({
  icon,
  label,
  state,
  active,
  light,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  state: string;
  active: boolean;
  light: boolean;
  onPress: () => void;
}) {
  return (
    <AppPressable style={[styles.chip, light && styles.chipLight, active && styles.chipActive]} onPress={onPress}>
      <View style={[styles.chipIcon, active && styles.chipIconActive, light && !active && styles.chipIconLight]}>
        <Ionicons name={icon} size={13} color={active ? "#fff" : light ? colors.ink700 : colors.cream50} />
      </View>
      <Text style={[styles.chipLabel, light && styles.chipLabelLight]}>{label}</Text>
      <Text style={[styles.chipState, light && styles.chipStateLight, active && styles.chipStateActive]}>{state}</Text>
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#0e1218",
  },
  rootLight: {
    backgroundColor: "#dbe3ee",
  },
  canvas: {
    ...StyleSheet.absoluteFillObject,
  },
  topFade: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 280,
  },
  bottomFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 260,
  },
  topHud: {
    paddingHorizontal: 20,
    gap: 12,
    pointerEvents: "box-none",
  },
  hudHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  hudHeaderLeft: {
    flex: 1,
    gap: 2,
  },
  hudEyebrow: {
    fontFamily: "monospace",
    fontSize: 10,
    color: "rgba(244,245,247,0.78)",
    letterSpacing: 1.2,
  },
  hudEyebrowLight: {
    color: colors.ink700,
  },
  hudTitle: {
    color: colors.cream50,
    fontSize: 34,
    fontWeight: "700",
    letterSpacing: -0.9,
    lineHeight: 38,
  },
  hudTitleLight: {
    color: colors.ink900,
  },
  hudBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(244,245,247,0.16)",
    borderWidth: 0.5,
    borderColor: "rgba(244,245,247,0.2)",
  },
  hudBadgeLight: {
    backgroundColor: "rgba(255,255,255,0.7)",
    borderColor: "rgba(255,255,255,0.8)",
  },
  hudDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
  },
  hudBadgeText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: colors.cream50,
    letterSpacing: 0.8,
  },
  hudBadgeTextLight: {
    color: colors.ink900,
  },
  roomPicker: {
    gap: 6,
    paddingRight: 20,
  },
  roomChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: "rgba(244,245,247,0.12)",
    borderWidth: 0.5,
    borderColor: "rgba(244,245,247,0.14)",
  },
  roomChipLight: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderColor: "rgba(255,255,255,0.8)",
  },
  roomChipActive: {
    backgroundColor: colors.cream50,
    borderColor: colors.cream50,
  },
  roomChipActiveLight: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  roomEmoji: {
    fontSize: 13,
  },
  roomChipText: {
    color: "rgba(244,245,247,0.9)",
    fontSize: 12.5,
    fontWeight: "500",
  },
  roomChipTextLight: {
    color: colors.ink700,
  },
  roomChipTextActive: {
    color: colors.ink900,
  },
  roomChipTextActiveLight: {
    color: colors.cream50,
  },
  chipRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 999,
    backgroundColor: "rgba(244,245,247,0.14)",
    borderWidth: 0.5,
    borderColor: "rgba(244,245,247,0.2)",
  },
  chipLight: {
    backgroundColor: "rgba(255,255,255,0.65)",
    borderColor: "rgba(255,255,255,0.8)",
  },
  chipActive: {
    borderColor: colors.accent,
  },
  chipIcon: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(244,245,247,0.2)",
  },
  chipIconLight: {
    backgroundColor: "rgba(11,13,18,0.12)",
  },
  chipIconActive: {
    backgroundColor: colors.accent,
  },
  chipLabel: {
    color: colors.cream50,
    fontSize: 11.5,
    fontWeight: "500",
  },
  chipLabelLight: {
    color: colors.ink900,
  },
  chipState: {
    fontFamily: "monospace",
    color: "rgba(244,245,247,0.65)",
    fontSize: 10.5,
    fontWeight: "600",
  },
  chipStateLight: {
    color: colors.ink500,
  },
  chipStateActive: {
    color: colors.accent,
  },
  dragHintWrap: {
    position: "absolute",
    bottom: 220,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dragHint: {
    fontFamily: "monospace",
    fontSize: 11,
    color: "rgba(244,245,247,0.45)",
    letterSpacing: 0.8,
  },
  dragHintLight: {
    color: "rgba(11,13,18,0.45)",
  },
  bottomPanel: {
    position: "absolute",
    left: 20,
    right: 20,
    bottom: 0,
  },
  intensityCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  intensityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  intensityLabel: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink700,
    letterSpacing: 1.2,
  },
  intensityValue: {
    fontFamily: "monospace",
    fontSize: 13,
    color: colors.ink900,
    fontWeight: "700",
  },
  intensityUnit: {
    color: colors.ink500,
  },
  intensityControlRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  intensityStepButton: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  intensityTrackTouch: {
    flex: 1,
    height: 30,
    justifyContent: "center",
  },
  intensityTrack: {
    height: 6,
    borderRadius: 999,
    backgroundColor: "rgba(11,13,18,0.15)",
    overflow: "visible",
  },
  intensityFill: {
    height: 6,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  intensityKnob: {
    position: "absolute",
    top: -8,
    width: 22,
    height: 22,
    borderRadius: 999,
    backgroundColor: colors.accent,
    borderWidth: 3,
    borderColor: "#fff",
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 4,
  },
  intensityHint: {
    marginTop: 7,
    color: colors.ink500,
    fontSize: 11.5,
  },
  panelActions: {
    flexDirection: "row",
    gap: 10,
  },
  allOnBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  allOnText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  allOffBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.72)",
    borderWidth: 0.5,
    borderColor: "rgba(255,255,255,0.8)",
  },
  allOffBtnDark: {
    backgroundColor: "rgba(244,245,247,0.12)",
    borderColor: "rgba(244,245,247,0.18)",
  },
  allOffText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: "600",
  },
  allOffTextDark: {
    color: colors.cream50,
  },
});
