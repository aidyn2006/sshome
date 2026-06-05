import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import type { Device, DeviceStatus } from "../types/smartHome";

// ——— tiny helpers (kept local so this screen has zero GL/three dependencies) ———

function isOn(status?: DeviceStatus): boolean {
  return status === "ON";
}

function isOpen(status?: DeviceStatus): boolean {
  return status === "OPEN";
}

function clampIntensity(value: number): number {
  return Math.max(10, Math.min(100, value));
}

function pickByType(devices: Device[], type: Device["type"], roomId?: string): Device | undefined {
  return (
    devices.find((d) => d.type === type && d.room_id === roomId) ??
    (roomId ? undefined : devices.find((d) => d.type === type))
  );
}

type RoomVariant = "living" | "bedroom" | "kitchen" | "bath";

function getRoomVariant(name: string | undefined, index: number): RoomVariant {
  const n = (name ?? "").toLowerCase();
  if (n.includes("bed")) return "bedroom";
  if (n.includes("kitchen")) return "kitchen";
  if (n.includes("bath")) return "bath";
  if (n.includes("living") || n.includes("lounge")) return "living";
  return (["living", "bedroom", "kitchen", "bath"] as const)[index % 4];
}

// ——— scene palette ———

const night = {
  backdrop: "#0b101c",
  wall: "#1b2333",
  wallSide: "#141b29",
  ceiling: "#101624",
  floor: "#231d2c",
  floorEdge: "#1a1521",
  baseboard: "#2a3247",
  windowSky: "#1d2c4e",
  doorway: "#070a12",
};

const day = {
  backdrop: "#dfe7f2",
  wall: "#f0e9dd",
  wallSide: "#e0d6c6",
  ceiling: "#f7f2e9",
  floor: "#caa87c",
  floorEdge: "#b08f64",
  baseboard: "#d8cdbb",
  windowSky: "#9cc4ee",
  doorway: "#3c3429",
};

const VARIANT_ACCENT: Record<RoomVariant, string> = {
  living: "#E8A26C",
  bedroom: "#7A5AE0",
  kitchen: "#1F8A5B",
  bath: "#2A6FDB",
};

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
    () => getRoomVariant(selectedRoom?.name, Math.max(selectedRoomIndex, 0)),
    [selectedRoom?.name, selectedRoomIndex]
  );

  // Same live data pipeline as the rest of the app: device state arrives over the
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
        <RoomIllustration
          lightOn={lightOn}
          doorOpen={doorOpen}
          windowOpen={windowOpen}
          intensity={intensity}
          hasLight={Boolean(lightDevice)}
          hasDoor={Boolean(doorDevice)}
          variant={roomVariant}
          onLightPress={toggleLight}
          onDoorPress={toggleDoor}
          onWindowPress={toggleWindow}
        />
      </View>

      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.eyebrow}>ROOM / LIVE VIEW</Text>
              <Text style={styles.title}>{roomName}</Text>
            </View>
            <View style={styles.badge}>
              <View style={[styles.badgeDot, { backgroundColor: activeCount > 0 ? colors.success : colors.ink400 }]} />
              <Text style={styles.badgeText}>{activeCount} ACTIVE</Text>
            </View>
          </View>

          <Text style={styles.description}>
            Click the lamp, the door or the window in the scene to control real devices. Changes made
            from your phone appear here live.
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

// ——— the pure-React room: a one-point-perspective cutaway, no WebGL ———

const SCENE_W = 560;
const SCENE_H = 430;
const WALL_W = 360;
const WALL_H = 230;
const WALL_X = (SCENE_W - WALL_W) / 2;
const WALL_Y = 56;
const DEPTH = 96; // how far the floor/ceiling/side walls extend toward the viewer

type SceneProps = {
  lightOn: boolean;
  doorOpen: boolean;
  windowOpen: boolean;
  intensity: number;
  hasLight: boolean;
  hasDoor: boolean;
  variant: RoomVariant;
  onLightPress: () => void;
  onDoorPress: () => void;
  onWindowPress: () => void;
};

function RoomIllustration({
  lightOn,
  doorOpen,
  windowOpen,
  intensity,
  hasLight,
  hasDoor,
  variant,
  onLightPress,
  onDoorPress,
  onWindowPress,
}: SceneProps) {
  const palette = lightOn ? day : night;
  const accent = VARIANT_ACCENT[variant];

  const glow = useRef(new Animated.Value(lightOn ? 1 : 0)).current;
  const doorAngle = useRef(new Animated.Value(doorOpen ? 1 : 0)).current;
  const pane = useRef(new Animated.Value(windowOpen ? 1 : 0)).current;

  useEffect(() => {
    Animated.timing(glow, { toValue: lightOn ? 1 : 0, duration: 360, useNativeDriver: true }).start();
  }, [glow, lightOn]);

  useEffect(() => {
    Animated.spring(doorAngle, { toValue: doorOpen ? 1 : 0, useNativeDriver: true, speed: 9, bounciness: 4 }).start();
  }, [doorAngle, doorOpen]);

  useEffect(() => {
    Animated.timing(pane, { toValue: windowOpen ? 1 : 0, duration: 420, useNativeDriver: true }).start();
  }, [pane, windowOpen]);

  const glowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 0.28 + (intensity / 100) * 0.5],
  });
  const doorRotate = doorAngle.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-58deg"] });
  const paneShift = pane.interpolate({ inputRange: [0, 1], outputRange: [0, -46] });

  return (
    <View style={scene.viewport}>
      <View style={[scene.stage, { backgroundColor: palette.backdrop }]}>
        {/* ceiling */}
        <View
          style={[
            scene.trapezoid,
            {
              top: WALL_Y - DEPTH,
              left: WALL_X - DEPTH,
              borderBottomWidth: DEPTH,
              borderBottomColor: palette.ceiling,
              borderLeftWidth: DEPTH,
              borderRightWidth: DEPTH,
              width: WALL_W + DEPTH * 2,
            },
          ]}
        />

        {/* left wall */}
        <View
          style={[
            scene.trapezoid,
            {
              top: WALL_Y - DEPTH,
              left: WALL_X - DEPTH,
              borderRightWidth: DEPTH,
              borderRightColor: palette.wallSide,
              borderTopWidth: DEPTH,
              borderBottomWidth: DEPTH,
              height: WALL_H + DEPTH * 2,
            },
          ]}
        />

        {/* right wall */}
        <View
          style={[
            scene.trapezoid,
            {
              top: WALL_Y - DEPTH,
              left: WALL_X + WALL_W,
              borderLeftWidth: DEPTH,
              borderLeftColor: palette.wallSide,
              borderTopWidth: DEPTH,
              borderBottomWidth: DEPTH,
              height: WALL_H + DEPTH * 2,
            },
          ]}
        />

        {/* floor */}
        <View
          style={[
            scene.trapezoid,
            {
              top: WALL_Y + WALL_H,
              left: WALL_X - DEPTH,
              borderTopWidth: DEPTH,
              borderTopColor: palette.floor,
              borderLeftWidth: DEPTH,
              borderRightWidth: DEPTH,
              width: WALL_W + DEPTH * 2,
            },
          ]}
        />
        {/* floor front edge */}
        <View
          style={{
            position: "absolute",
            top: WALL_Y + WALL_H + DEPTH,
            left: WALL_X - DEPTH,
            width: WALL_W + DEPTH * 2,
            height: 8,
            backgroundColor: palette.floorEdge,
          }}
        />

        {/* back wall */}
        <View
          style={{
            position: "absolute",
            top: WALL_Y,
            left: WALL_X,
            width: WALL_W,
            height: WALL_H,
            backgroundColor: palette.wall,
          }}
        >
          {/* baseboard */}
          <View style={[scene.baseboard, { backgroundColor: palette.baseboard }]} />

          {/* door (left side of the back wall) */}
          <Pressable
            onPress={hasDoor ? onDoorPress : undefined}
            disabled={!hasDoor}
            style={[scene.doorFrame, !hasDoor && { opacity: 0.45 }]}
          >
            {/* dark opening revealed when the door swings */}
            <View style={[scene.doorway, { backgroundColor: palette.doorway }]} />
            <Animated.View
              style={[
                scene.doorPanel,
                {
                  backgroundColor: lightOn ? "#8a6a48" : "#33405c",
                  transform: [{ perspective: 700 }, { translateX: -31 }, { rotateY: doorRotate }, { translateX: 31 }],
                },
              ]}
            >
              <View style={scene.doorHandle} />
            </Animated.View>
          </Pressable>

          {/* window (right side of the back wall) */}
          <Pressable onPress={onWindowPress} style={scene.windowFrame}>
            <View style={[scene.windowSky, { backgroundColor: palette.windowSky }]}>
              {/* moon / sun */}
              <View
                style={[
                  scene.celestial,
                  lightOn ? { backgroundColor: "#ffd76e" } : { backgroundColor: "#cfd9ec" },
                ]}
              />
              {/* sliding pane */}
              <Animated.View style={[scene.windowPane, { transform: [{ translateX: paneShift }] }]} />
              {/* mullions */}
              <View style={scene.mullionV} />
              <View style={scene.mullionH} />
            </View>
          </Pressable>

          {/* wall art */}
          <View style={[scene.wallArt, { borderColor: accent }]}>
            <View style={[scene.wallArtInner, { backgroundColor: `${accent}33` }]} />
          </View>
        </View>

        {/* pendant lamp (over the room center) */}
        <Pressable
          onPress={hasLight ? onLightPress : undefined}
          disabled={!hasLight}
          style={[scene.lampHitbox, !hasLight && { opacity: 0.45 }]}
        >
          <View style={scene.lampCord} />
          <View style={[scene.lampShade, lightOn && { backgroundColor: "#3a3f4d" }]}>
            <View style={[scene.lampBulb, lightOn && { backgroundColor: "#ffd76e" }]} />
          </View>
        </Pressable>

        {/* light cone + glow pool */}
        <Animated.View pointerEvents="none" style={[scene.lightCone, { opacity: glowOpacity }]} />
        <Animated.View pointerEvents="none" style={[scene.lightPool, { opacity: glowOpacity }]} />

        {/* furniture */}
        <Furniture variant={variant} lightOn={lightOn} accent={accent} />

        {/* rug */}
        <View
          pointerEvents="none"
          style={[scene.rug, { borderColor: `${accent}55`, backgroundColor: lightOn ? `${accent}1f` : `${accent}14` }]}
        />
      </View>
    </View>
  );
}

function Furniture({ variant, lightOn, accent }: { variant: RoomVariant; lightOn: boolean; accent: string }) {
  const body = lightOn ? "#e7dccb" : "#222b3f";
  const shade = lightOn ? "#d4c5ad" : "#1a2233";

  if (variant === "bedroom") {
    return (
      <View pointerEvents="none" style={scene.furnitureLayer}>
        <View style={[f.bedBase, { backgroundColor: shade }]} />
        <View style={[f.bedMattress, { backgroundColor: body }]} />
        <View style={[f.bedPillow, { backgroundColor: lightOn ? "#fff" : "#33405c" }]} />
        <View style={[f.bedBlanket, { backgroundColor: `${accent}cc` }]} />
        <View style={[f.nightstand, { backgroundColor: shade }]} />
      </View>
    );
  }

  if (variant === "kitchen") {
    return (
      <View pointerEvents="none" style={scene.furnitureLayer}>
        <View style={[f.counter, { backgroundColor: body }]} />
        <View style={[f.counterTop, { backgroundColor: lightOn ? "#fbf6ec" : "#33405c" }]} />
        <View style={[f.fridge, { backgroundColor: lightOn ? "#f2f2f0" : "#2b3650" }]}>
          <View style={f.fridgeLine} />
        </View>
        <View style={[f.stool, { backgroundColor: `${accent}cc` }]} />
        <View style={[f.stool, { left: 318, backgroundColor: `${accent}cc` }]} />
      </View>
    );
  }

  if (variant === "bath") {
    return (
      <View pointerEvents="none" style={scene.furnitureLayer}>
        <View style={[f.tub, { backgroundColor: lightOn ? "#ffffff" : "#2b3650" }]} />
        <View style={[f.tubInner, { backgroundColor: lightOn ? "#dbeafe" : "#1c2740" }]} />
        <View style={[f.mirror, { borderColor: accent, backgroundColor: lightOn ? "#e7f0fb" : "#202c47" }]} />
      </View>
    );
  }

  // living room (default)
  return (
    <View pointerEvents="none" style={scene.furnitureLayer}>
      <View style={[f.sofaBack, { backgroundColor: shade }]} />
      <View style={[f.sofaSeat, { backgroundColor: body }]} />
      <View style={[f.sofaCushion, { backgroundColor: `${accent}cc` }]} />
      <View style={[f.sofaCushion, { left: 248, backgroundColor: `${accent}88` }]} />
      <View style={[f.coffeeTable, { backgroundColor: shade }]} />
      <View style={[f.plantPot, { backgroundColor: shade }]} />
      <View style={[f.plantLeaves, { backgroundColor: lightOn ? "#3f9d63" : "#2a5741" }]} />
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

const scene = StyleSheet.create({
  viewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    paddingTop: 24,
  },
  stage: {
    width: SCENE_W,
    height: SCENE_H,
    borderRadius: 28,
    overflow: "hidden",
  },
  trapezoid: {
    position: "absolute",
    width: 0,
    height: 0,
    borderColor: "transparent",
    borderStyle: "solid",
  },
  baseboard: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 10,
  },
  // door
  doorFrame: {
    position: "absolute",
    left: 34,
    bottom: 10,
    width: 62,
    height: 132,
    borderWidth: 4,
    borderBottomWidth: 0,
    borderColor: "rgba(255,255,255,0.14)",
  },
  doorway: {
    ...StyleSheet.absoluteFillObject,
  },
  doorPanel: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 1,
  },
  doorHandle: {
    position: "absolute",
    right: 7,
    top: "48%",
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#ffd76e",
  },
  // window
  windowFrame: {
    position: "absolute",
    right: 36,
    top: 34,
    width: 104,
    height: 86,
    borderWidth: 5,
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 4,
  },
  windowSky: {
    flex: 1,
    overflow: "hidden",
  },
  celestial: {
    position: "absolute",
    top: 12,
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
  },
  windowPane: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(180, 205, 235, 0.22)",
    borderRightWidth: 2,
    borderRightColor: "rgba(255,255,255,0.35)",
  },
  mullionV: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: "50%",
    width: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  mullionH: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  wallArt: {
    position: "absolute",
    top: 44,
    left: 138,
    width: 64,
    height: 46,
    borderWidth: 2,
    borderRadius: 4,
  },
  wallArtInner: {
    flex: 1,
    margin: 4,
    borderRadius: 2,
  },
  // lamp
  lampHitbox: {
    position: "absolute",
    top: 0,
    left: SCENE_W / 2 - 30,
    width: 60,
    height: 96,
    alignItems: "center",
  },
  lampCord: {
    width: 2,
    height: 48,
    backgroundColor: "rgba(255,255,255,0.35)",
  },
  lampShade: {
    width: 46,
    height: 26,
    borderTopLeftRadius: 23,
    borderTopRightRadius: 23,
    backgroundColor: "#2a3145",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  lampBulb: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginBottom: -6,
    backgroundColor: "#3d4763",
  },
  lightCone: {
    position: "absolute",
    top: 74,
    left: SCENE_W / 2 - 120,
    width: 0,
    height: 0,
    borderStyle: "solid",
    borderLeftWidth: 120,
    borderRightWidth: 120,
    borderBottomWidth: 250,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: "rgba(255, 215, 110, 0.55)",
  },
  lightPool: {
    position: "absolute",
    top: WALL_Y + WALL_H + 4,
    left: SCENE_W / 2 - 150,
    width: 300,
    height: 86,
    borderRadius: 150,
    backgroundColor: "rgba(255, 215, 110, 0.5)",
  },
  furnitureLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  rug: {
    position: "absolute",
    top: WALL_Y + WALL_H + 26,
    left: SCENE_W / 2 - 120,
    width: 240,
    height: 52,
    borderRadius: 120,
    borderWidth: 1.5,
  },
});

const f = StyleSheet.create({
  // living
  sofaBack: {
    position: "absolute",
    top: 196,
    left: 196,
    width: 150,
    height: 44,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  sofaSeat: {
    position: "absolute",
    top: 232,
    left: 188,
    width: 166,
    height: 40,
    borderRadius: 10,
  },
  sofaCushion: {
    position: "absolute",
    top: 206,
    left: 208,
    width: 36,
    height: 26,
    borderRadius: 6,
  },
  coffeeTable: {
    position: "absolute",
    top: 296,
    left: 226,
    width: 92,
    height: 16,
    borderRadius: 8,
  },
  plantPot: {
    position: "absolute",
    top: 244,
    left: 128,
    width: 26,
    height: 28,
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
  },
  plantLeaves: {
    position: "absolute",
    top: 208,
    left: 118,
    width: 46,
    height: 42,
    borderRadius: 23,
  },
  // bedroom
  bedBase: {
    position: "absolute",
    top: 236,
    left: 188,
    width: 176,
    height: 40,
    borderRadius: 8,
  },
  bedMattress: {
    position: "absolute",
    top: 218,
    left: 192,
    width: 168,
    height: 26,
    borderRadius: 8,
  },
  bedPillow: {
    position: "absolute",
    top: 208,
    left: 200,
    width: 40,
    height: 18,
    borderRadius: 6,
  },
  bedBlanket: {
    position: "absolute",
    top: 218,
    left: 252,
    width: 108,
    height: 26,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
  },
  nightstand: {
    position: "absolute",
    top: 236,
    left: 142,
    width: 34,
    height: 34,
    borderRadius: 6,
  },
  // kitchen
  counter: {
    position: "absolute",
    top: 224,
    left: 178,
    width: 170,
    height: 52,
    borderRadius: 6,
  },
  counterTop: {
    position: "absolute",
    top: 218,
    left: 172,
    width: 182,
    height: 10,
    borderRadius: 5,
  },
  fridge: {
    position: "absolute",
    top: 180,
    left: 372,
    width: 44,
    height: 96,
    borderRadius: 6,
  },
  fridgeLine: {
    position: "absolute",
    top: 34,
    left: 4,
    right: 4,
    height: 2,
    backgroundColor: "rgba(0,0,0,0.18)",
  },
  stool: {
    position: "absolute",
    top: 288,
    left: 264,
    width: 26,
    height: 12,
    borderRadius: 6,
  },
  // bath
  tub: {
    position: "absolute",
    top: 224,
    left: 196,
    width: 160,
    height: 52,
    borderRadius: 26,
  },
  tubInner: {
    position: "absolute",
    top: 232,
    left: 206,
    width: 140,
    height: 30,
    borderRadius: 17,
  },
  mirror: {
    position: "absolute",
    top: 96,
    left: 246,
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
  },
});

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
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(209, 213, 219, 0.8)",
    maxWidth: 720,
    width: "100%",
    alignSelf: "center"
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
