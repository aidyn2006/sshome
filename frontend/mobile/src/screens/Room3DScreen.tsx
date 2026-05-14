import { Ionicons } from "@expo/vector-icons";
import { OrbitControls } from "@react-three/drei/native";
import { Canvas } from "@react-three/fiber/native";
import { LinearGradient } from "expo-linear-gradient";
import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as THREE from "three";

import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import type { Device, DeviceStatus } from "../types/smartHome";

type SceneProps = {
  lightOn: boolean;
  doorOpen: boolean;
  windowOpen: boolean;
  intensity: number;
  onLightPress: () => void;
  onDoorPress: () => void;
  onWindowPress: () => void;
};

function RoomScene({
  lightOn,
  doorOpen,
  windowOpen,
  intensity,
  onLightPress,
  onDoorPress,
  onWindowPress,
}: SceneProps) {
  const k = intensity / 100;
  const palette = lightOn
    ? {
        bg: "#dbe3ee",
        fog: "#a9b7c8",
        wall: "#e9e4dc",
        floor: "#8a6a4c",
        ceiling: "#f3eee3",
        couch: "#6b7a8a",
        cushion: "#8da3b8",
        trim: "#ffffff",
        door: "#c4d0dc",
        doorPanel: "#a6b3c2",
        rug: "#2563eb",
        rugInner: "#1d4fce",
        table: "#2a2a2a",
        sky: "#a9c5e6",
        glass: "#b7d8ec",
        plant: "#2d6e3a",
      }
    : {
        bg: "#0e1218",
        fog: "#111827",
        wall: "#1b2230",
        floor: "#252033",
        ceiling: "#151a24",
        couch: "#263244",
        cushion: "#334358",
        trim: "#303947",
        door: "#243246",
        doorPanel: "#31445f",
        rug: "#153f9f",
        rugInner: "#102f78",
        table: "#111827",
        sky: "#2e4760",
        glass: "#5b8db8",
        plant: "#25583c",
      };

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.fog, 12, 28]} />

      <ambientLight intensity={lightOn ? 0.36 + 0.12 * k : 0.26} />
      <directionalLight
        position={[-4, 5, -6]}
        intensity={lightOn ? 0.58 : 0.46}
        color={lightOn ? "#c9ddf5" : "#7ea3d7"}
      />
      <pointLight
        position={[0, 2.7, 0]}
        intensity={lightOn ? 1.6 * k + 0.35 : 0.18}
        distance={10}
        decay={1.3}
        color={lightOn ? "#ffd6a0" : "#5f7fb8"}
      />

      <group position={[0, -0.55, 0]}>
        {/* Floor */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onLightPress}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color={palette.floor} roughness={0.72} />
        </mesh>

        {[-2, -1, 0, 1, 2].map((i) => (
          <mesh key={`plank-${i}`} position={[0, 0.006, i * 1.1]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[6, 0.012]} />
            <meshStandardMaterial color={lightOn ? "#3a2614" : "#0f1320"} transparent opacity={0.35} roughness={1} />
          </mesh>
        ))}

        {/* Walls and ceiling */}
        <mesh position={[0, 1.6, -3]} receiveShadow>
          <planeGeometry args={[6, 3.2]} />
          <meshStandardMaterial color={palette.wall} roughness={0.92} />
        </mesh>
        <mesh position={[-3, 1.6, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[6, 3.2]} />
          <meshStandardMaterial color={palette.wall} roughness={0.92} />
        </mesh>
        <mesh position={[0, 3.2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <planeGeometry args={[6, 6]} />
          <meshStandardMaterial color={palette.ceiling} roughness={0.95} />
        </mesh>

        {/* Base trim */}
        <mesh position={[0, 0.06, -2.99]}>
          <boxGeometry args={[6, 0.12, 0.04]} />
          <meshStandardMaterial color={palette.trim} roughness={0.6} />
        </mesh>
        <mesh position={[-2.99, 0.06, 0]} rotation={[0, Math.PI / 2, 0]}>
          <boxGeometry args={[6, 0.12, 0.04]} />
          <meshStandardMaterial color={palette.trim} roughness={0.6} />
        </mesh>

        {/* Pendant light */}
        <mesh position={[0, 2.97, 0]}>
          <cylinderGeometry args={[0.015, 0.015, 0.45, 6]} />
          <meshStandardMaterial color={lightOn ? "#1a1a1a" : "#3d4654"} />
        </mesh>
        <mesh position={[0, 2.6, 0]} rotation={[Math.PI, 0, 0]}>
          <coneGeometry args={[0.28, 0.36, 18, 1, true]} />
          <meshStandardMaterial color={lightOn ? "#1a1a1a" : "#2c3440"} side={THREE.DoubleSide} roughness={0.4} />
        </mesh>
        <mesh position={[0, 2.6, 0]} onClick={onLightPress}>
          <sphereGeometry args={[0.11, 18, 18]} />
          <meshStandardMaterial
            color={lightOn ? "#ffe8c0" : "#56677f"}
            emissive={lightOn ? "#ffb766" : "#20385c"}
            emissiveIntensity={lightOn ? 2.5 * k : 0.35}
            roughness={0.4}
          />
        </mesh>

        {/* Window */}
        <group position={[1.5, 1.7, -2.95]}>
          <mesh position={[0, 0, -0.08]}>
            <planeGeometry args={[1.8, 1.4]} />
            <meshBasicMaterial color={palette.sky} />
          </mesh>
          <mesh>
            <planeGeometry args={[1.4, 1.1]} />
            <meshStandardMaterial color={palette.glass} transparent opacity={lightOn ? 0.35 : 0.5} roughness={0.1} metalness={0.2} />
          </mesh>
          <FramePiece args={[1.5, 0.06, 0.08]} position={[0, 0.55, 0.04]} color={palette.trim} />
          <FramePiece args={[1.5, 0.06, 0.08]} position={[0, -0.55, 0.04]} color={palette.trim} />
          <FramePiece args={[0.06, 1.16, 0.08]} position={[0.72, 0, 0.04]} color={palette.trim} />
          <FramePiece args={[0.06, 1.16, 0.08]} position={[-0.72, 0, 0.04]} color={palette.trim} />
          <FramePiece args={[1.4, 0.04, 0.08]} position={[0, 0, 0.06]} color={palette.trim} />
          <FramePiece args={[0.04, 1.1, 0.08]} position={[0, 0, 0.06]} color={palette.trim} />
          <group position={[0, 0, 0.09]} rotation={[0, windowOpen ? Math.PI / 4 : 0, 0]}>
            <mesh position={[0.34, 0.26, 0]} onClick={onWindowPress}>
              <planeGeometry args={[0.68, 0.5]} />
              <meshStandardMaterial
                color={palette.glass}
                transparent
                opacity={0.62}
                roughness={0.05}
                metalness={0.3}
                side={THREE.DoubleSide}
              />
            </mesh>
          </group>
        </group>

        {/* Door */}
        <group position={[-1.8, 0, -2.95]}>
          <FramePiece args={[1, 0.08, 0.05]} position={[0.45, 2.18, -0.04]} color={palette.trim} />
          <FramePiece args={[0.08, 2.2, 0.05]} position={[-0.04, 1.1, -0.04]} color={palette.trim} />
          <FramePiece args={[0.08, 2.2, 0.05]} position={[0.94, 1.1, -0.04]} color={palette.trim} />
          <group rotation={[0, doorOpen ? Math.PI / 2.5 : 0, 0]}>
            <mesh position={[0.45, 1.05, 0.04]} onClick={onDoorPress}>
              <boxGeometry args={[0.9, 2.1, 0.06]} />
              <meshStandardMaterial color={doorOpen ? "#6e8ef5" : palette.door} roughness={0.52} />
            </mesh>
            <mesh position={[0.45, 1.55, 0.075]}>
              <planeGeometry args={[0.55, 0.7]} />
              <meshStandardMaterial color={palette.doorPanel} roughness={0.55} />
            </mesh>
            <mesh position={[0.45, 0.55, 0.075]}>
              <planeGeometry args={[0.55, 0.55]} />
              <meshStandardMaterial color={palette.doorPanel} roughness={0.55} />
            </mesh>
            <mesh position={[0.82, 1.05, 0.1]}>
              <sphereGeometry args={[0.045, 12, 12]} />
              <meshStandardMaterial color="#c7a45a" metalness={0.9} roughness={0.3} />
            </mesh>
          </group>
        </group>

        {/* Couch */}
        <group position={[0.3, 0, -1.3]}>
          <mesh position={[0, 0.225, 0]} castShadow receiveShadow>
            <boxGeometry args={[2.2, 0.45, 0.85]} />
            <meshStandardMaterial color={palette.couch} roughness={0.85} />
          </mesh>
          <mesh position={[0, 0.6, -0.31]} castShadow>
            <boxGeometry args={[2.2, 0.7, 0.22]} />
            <meshStandardMaterial color={palette.couch} roughness={0.85} />
          </mesh>
          <mesh position={[-1, 0.5, 0]} castShadow>
            <boxGeometry args={[0.18, 0.55, 0.85]} />
            <meshStandardMaterial color={palette.couch} roughness={0.85} />
          </mesh>
          <mesh position={[1, 0.5, 0]} castShadow>
            <boxGeometry args={[0.18, 0.55, 0.85]} />
            <meshStandardMaterial color={palette.couch} roughness={0.85} />
          </mesh>
          {[-0.5, 0.5].map((x) => (
            <mesh key={`cushion-${x}`} position={[x, 0.525, 0.05]} castShadow>
              <boxGeometry args={[0.95, 0.15, 0.65]} />
              <meshStandardMaterial color={palette.cushion} roughness={0.85} />
            </mesh>
          ))}
          <mesh position={[-0.7, 0.7, -0.12]} rotation={[0, 0, 0.2]} castShadow>
            <boxGeometry args={[0.4, 0.3, 0.15]} />
            <meshStandardMaterial color="#e8a26c" roughness={0.9} />
          </mesh>
        </group>

        {/* Rug */}
        <mesh position={[0.3, 0.007, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[2.6, 1.6]} />
          <meshStandardMaterial color={palette.rug} roughness={0.95} />
        </mesh>
        <mesh position={[0.3, 0.009, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2.2, 1.2]} />
          <meshStandardMaterial color={palette.rugInner} roughness={0.95} />
        </mesh>

        {/* Coffee table */}
        <mesh position={[0.3, 0.42, -0.2]} castShadow>
          <boxGeometry args={[1, 0.05, 0.55]} />
          <meshStandardMaterial color={palette.table} roughness={0.6} metalness={0.2} />
        </mesh>
        {[[-0.18, -0.25], [0.18, -0.25], [-0.18, 0.25], [0.18, 0.25]].map(([dx, dz]) => (
          <mesh key={`leg-${dx}-${dz}`} position={[0.3 + dx, 0.2, -0.2 + dz]} castShadow>
            <boxGeometry args={[0.04, 0.4, 0.04]} />
            <meshStandardMaterial color={palette.table} roughness={0.6} metalness={0.2} />
          </mesh>
        ))}
        <mesh position={[0.15, 0.46, -0.15]} rotation={[0, -0.3, 0]} castShadow>
          <boxGeometry args={[0.22, 0.025, 0.16]} />
          <meshStandardMaterial color="#c7253e" roughness={0.8} />
        </mesh>

        {/* Plant */}
        <mesh position={[-2.4, 0.175, 1.8]} castShadow receiveShadow>
          <cylinderGeometry args={[0.22, 0.18, 0.35, 16]} />
          <meshStandardMaterial color="#c1733f" roughness={0.75} />
        </mesh>
        <mesh position={[-2.4, 0.36, 1.8]}>
          <cylinderGeometry args={[0.21, 0.21, 0.02, 16]} />
          <meshStandardMaterial color="#2a1a0a" roughness={1} />
        </mesh>
        {[
          [-2.28, 0.58, 1.8, 0.22],
          [-2.5, 0.62, 1.72, 0.18],
          [-2.4, 0.72, 1.92, 0.2],
          [-2.52, 0.5, 1.93, 0.17],
          [-2.28, 0.48, 1.68, 0.18],
        ].map(([x, y, z, r], index) => (
          <mesh key={`leaf-${index}`} position={[x, y, z]} castShadow>
            <icosahedronGeometry args={[r, 0]} />
            <meshStandardMaterial color={palette.plant} roughness={0.9} />
          </mesh>
        ))}

        {/* Side table and lamp */}
        <mesh position={[-1.8, 0.55, -1.4]} castShadow>
          <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
          <meshStandardMaterial color={palette.table} roughness={0.6} metalness={0.2} />
        </mesh>
        <mesh position={[-1.8, 0.275, -1.4]}>
          <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
          <meshStandardMaterial color={palette.table} roughness={0.6} />
        </mesh>
        <mesh position={[-1.8, 0.59, -1.4]}>
          <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
          <meshStandardMaterial color="#5a3e28" roughness={0.6} />
        </mesh>
        <mesh position={[-1.8, 0.76, -1.4]}>
          <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
          <meshStandardMaterial color="#5a3e28" roughness={0.6} />
        </mesh>
        <mesh position={[-1.8, 0.95, -1.4]}>
          <cylinderGeometry args={[0.14, 0.18, 0.18, 16, 1, true]} />
          <meshStandardMaterial
            color={lightOn ? "#faeac7" : "#6b7280"}
            emissive={lightOn ? "#ffd28e" : "#1e3a5f"}
            emissiveIntensity={lightOn ? 0.45 : 0.2}
            roughness={0.9}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      <OrbitControls
        enablePan={false}
        minDistance={4.5}
        maxDistance={8}
        minPolarAngle={0.45}
        maxPolarAngle={1.45}
        autoRotate
        autoRotateSpeed={0.35}
      />
    </>
  );
}

function FramePiece({
  args,
  position,
  color,
}: {
  args: [number, number, number];
  position: [number, number, number];
  color: string;
}) {
  return (
    <mesh position={position} castShadow>
      <boxGeometry args={args} />
      <meshStandardMaterial color={color} roughness={0.6} />
    </mesh>
  );
}

function pickByType(devices: Device[], type: Device["type"]): Device | undefined {
  return devices.find((d) => d.type === type);
}

function isOn(status: DeviceStatus | undefined) {
  return status === "ON";
}

function isOpen(status: DeviceStatus | undefined) {
  return status === "OPEN";
}

function clampIntensity(value: number) {
  return Math.max(0, Math.min(100, Math.round(value / 5) * 5));
}

export function Room3DScreen() {
  const insets = useSafeAreaInsets();
  const { devices, rooms, setDeviceStatus } = useSmartHome();
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [localWindowOpen, setLocalWindowOpen] = useState(true);
  const [intensity, setIntensity] = useState(82);
  const [trackWidth, setTrackWidth] = useState(0);
  const isSlidingRef = useRef(false);

  const selectedRoom = useMemo(
    () => rooms.find((room) => room.id === selectedRoomId) ?? rooms[0],
    [rooms, selectedRoomId]
  );

  const lightDevice = useMemo(() => pickByType(devices, "LIGHT"), [devices]);
  const doorDevice = useMemo(() => pickByType(devices, "DOOR"), [devices]);
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
  const knobLeft = trackWidth > 0 ? Math.max(0, Math.min(trackWidth - 22, (trackWidth - 22) * intensity / 100)) : 0;
  const fillWidth = trackWidth > 0 ? trackWidth * intensity / 100 : 0;

  const updateIntensityFromX = useCallback((x: number) => {
    if (trackWidth <= 0) return;
    setIntensity(clampIntensity((x / trackWidth) * 100));
  }, [trackWidth]);

  const intensityPanResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (event) => {
        isSlidingRef.current = true;
        updateIntensityFromX(event.nativeEvent.locationX);
      },
      onPanResponderMove: (event) => {
        updateIntensityFromX(event.nativeEvent.locationX);
      },
      onPanResponderRelease: () => {
        isSlidingRef.current = false;
      },
      onPanResponderTerminate: () => {
        isSlidingRef.current = false;
      },
    }),
    [updateIntensityFromX]
  );

  const nudgeIntensity = useCallback((delta: number) => {
    setIntensity((value) => clampIntensity(value + delta));
  }, []);

  return (
    <View style={[styles.root, lightOn && styles.rootLight]}>
      <View style={styles.canvas}>
        <Canvas camera={{ position: [5.5, 2.6, 5.5], fov: 38 }} shadows>
          <RoomScene
            lightOn={lightOn}
            doorOpen={doorOpen}
            windowOpen={windowOpen}
            intensity={intensity}
            onLightPress={toggleLight}
            onDoorPress={toggleDoor}
            onWindowPress={toggleWindow}
          />
        </Canvas>
      </View>

      <LinearGradient
        pointerEvents="none"
        colors={lightOn ? ["rgba(219,227,238,0.9)", "rgba(219,227,238,0)"] : ["rgba(14,18,24,0.88)", "rgba(14,18,24,0)"]}
        style={styles.topFade}
      />
      <LinearGradient
        pointerEvents="none"
        colors={lightOn ? ["rgba(169,183,200,0)", "rgba(169,183,200,0.9)"] : ["rgba(6,8,16,0)", "rgba(6,8,16,0.94)"]}
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
            pointerEvents="auto"
          >
            {rooms.map((room) => {
              const active = room.id === (selectedRoom?.id ?? rooms[0]?.id);
              return (
                <Pressable
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
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <View style={styles.chipRow} pointerEvents="auto">
          <HudChip icon="bulb-outline" label="Light" state={lightOn ? `${intensity}%` : "OFF"} active={lightOn} light={lightOn} onPress={toggleLight} />
          <HudChip icon="log-out-outline" label="Door" state={doorOpen ? "OPEN" : "LOCKED"} active={doorOpen} light={lightOn} onPress={toggleDoor} />
          <HudChip icon="partly-sunny-outline" label="Window" state={windowOpen ? "OPEN" : "CLOSED"} active={windowOpen} light={lightOn} onPress={toggleWindow} />
        </View>
      </View>

      <View pointerEvents="none" style={styles.dragHintWrap}>
        <Ionicons name="refresh" size={12} color={lightOn ? "rgba(11,13,18,0.45)" : "rgba(244,245,247,0.45)"} />
        <Text style={[styles.dragHint, lightOn && styles.dragHintLight]}>DRAG TO ROTATE</Text>
      </View>

      <View style={[styles.bottomPanel, { paddingBottom: Math.max(insets.bottom + 90, 110) }]}>
        {lightOn && (
          <View style={styles.intensityCard}>
            <View style={styles.intensityHeader}>
              <Text style={styles.intensityLabel}>INTENSITY</Text>
              <Text style={styles.intensityValue}>{intensity}<Text style={styles.intensityUnit}>%</Text></Text>
            </View>
            <View style={styles.intensityControlRow}>
              <Pressable
                style={styles.intensityStepButton}
                onPress={() => nudgeIntensity(-10)}
                hitSlop={8}
              >
                <Ionicons name="remove" size={16} color={colors.ink700} />
              </Pressable>

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

              <Pressable
                style={styles.intensityStepButton}
                onPress={() => nudgeIntensity(10)}
                hitSlop={8}
              >
                <Ionicons name="add" size={16} color={colors.ink700} />
              </Pressable>
            </View>
            <Text style={styles.intensityHint}>Drag the bar or use - / +</Text>
          </View>
        )}

        <View style={styles.panelActions}>
          <Pressable style={styles.allOnBtn} onPress={() => switchAll("ON")}>
            <Ionicons name="power" size={16} color="#fff" />
            <Text style={styles.allOnText}>Power on all</Text>
          </Pressable>
          <Pressable style={[styles.allOffBtn, !lightOn && styles.allOffBtnDark]} onPress={() => switchAll("OFF")}>
            <Ionicons name="power" size={16} color={lightOn ? colors.ink700 : colors.cream50} />
            <Text style={[styles.allOffText, !lightOn && styles.allOffTextDark]}>Power off</Text>
          </Pressable>
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
    <Pressable style={[styles.chip, light && styles.chipLight, active && styles.chipActive]} onPress={onPress}>
      <View style={[styles.chipIcon, active && styles.chipIconActive, light && !active && styles.chipIconLight]}>
        <Ionicons name={icon} size={13} color={active ? "#fff" : light ? colors.ink700 : colors.cream50} />
      </View>
      <Text style={[styles.chipLabel, light && styles.chipLabelLight]}>{label}</Text>
      <Text style={[styles.chipState, light && styles.chipStateLight, active && styles.chipStateActive]}>{state}</Text>
    </Pressable>
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
