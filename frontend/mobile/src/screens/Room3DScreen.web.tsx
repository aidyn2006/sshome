import { Ionicons } from "@expo/vector-icons";
import { OrbitControls, Html } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import * as THREE from "three";

import { colors } from "../theme/colors";

type RoomVariant = "living" | "bedroom" | "kitchen" | "bathroom" | "office";

type RoomTheme = {
  bg: string;
  fog: string;
  wall: string;
  floor: string;
  ceiling: string;
  trim: string;
  accent: string;
  accentInner: string;
  surface: string;
  surfaceSoft: string;
  highlight: string;
};

const ROOM_THEMES: Record<RoomVariant, RoomTheme> = {
  living: {
    bg: "#d8e0ea",
    fog: "#a9b7c8",
    wall: "#e9e4dc",
    floor: "#8a6a4c",
    ceiling: "#f3eee3",
    trim: "#ffffff",
    accent: "#2563eb",
    accentInner: "#1d4fce",
    surface: "#2a2a2a",
    surfaceSoft: "#6b7a8a",
    highlight: "#8da3b8"
  },
  bedroom: {
    bg: "#e6e0ea",
    fog: "#c7bfd0",
    wall: "#f3edf6",
    floor: "#8d5f4a",
    ceiling: "#fbf8fc",
    trim: "#ffffff",
    accent: "#8b5cf6",
    accentInner: "#6d28d9",
    surface: "#61486c",
    surfaceSoft: "#9a8aa8",
    highlight: "#d7c8e2"
  },
  kitchen: {
    bg: "#dde7da",
    fog: "#b8c7b6",
    wall: "#eef4ea",
    floor: "#9a6d4d",
    ceiling: "#fbfbf8",
    trim: "#ffffff",
    accent: "#16a34a",
    accentInner: "#0f7a34",
    surface: "#3e4a40",
    surfaceSoft: "#7f9184",
    highlight: "#bed4c1"
  },
  bathroom: {
    bg: "#dce7ec",
    fog: "#b6c7d1",
    wall: "#f2f7f8",
    floor: "#728594",
    ceiling: "#fcfdfe",
    trim: "#ffffff",
    accent: "#0ea5e9",
    accentInner: "#0284c7",
    surface: "#43515b",
    surfaceSoft: "#80909a",
    highlight: "#c6d8e0"
  },
  office: {
    bg: "#e2e0dc",
    fog: "#bcc0c2",
    wall: "#f3efe9",
    floor: "#80634d",
    ceiling: "#f8f6f3",
    trim: "#ffffff",
    accent: "#f59e0b",
    accentInner: "#d97706",
    surface: "#36404a",
    surfaceSoft: "#72818d",
    highlight: "#cfc8be"
  }
};

const ROOM_LABELS: Array<{ key: RoomVariant; title: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: "living", title: "Living", icon: "home-outline" },
  { key: "bedroom", title: "Bedroom", icon: "bed-outline" },
  { key: "kitchen", title: "Kitchen", icon: "restaurant-outline" },
  { key: "bathroom", title: "Bath", icon: "water-outline" },
  { key: "office", title: "Office", icon: "briefcase-outline" }
];

function FloatingAccent({ color }: { color: string }) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!meshRef.current) {
      return;
    }

    meshRef.current.rotation.x += delta * 0.25;
    meshRef.current.rotation.y += delta * 0.4;
    meshRef.current.position.y = 0.8 + Math.sin(state.clock.elapsedTime * 1.6) * 0.15;
  });

  return (
    <mesh ref={meshRef} position={[0.2, 0.8, -0.15]}>
      <octahedronGeometry args={[0.26, 0]} />
      <meshStandardMaterial color={color} roughness={0.3} metalness={0.15} />
    </mesh>
  );
}

function RoomScene({ variant }: { variant: RoomVariant }) {
  const theme = ROOM_THEMES[variant];

  return (
    <>
      <color attach="background" args={[theme.bg]} />
      <fog attach="fog" args={[theme.fog, 5.4, 16]} />

      <ambientLight intensity={0.7} />
      <directionalLight position={[4, 7, 4]} intensity={1.2} color="#fff9f0" castShadow />
      <pointLight position={[-2, 2.5, 1.5]} intensity={1.7} color={theme.accent} />
      <pointLight position={[0, 1.8, -2.5]} intensity={0.8} color={theme.highlight} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[12, 12]} />
        <meshStandardMaterial color={theme.floor} roughness={0.95} />
      </mesh>

      <mesh position={[0, 1.5, -3]} receiveShadow castShadow>
        <boxGeometry args={[6, 3, 0.16]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>

      <mesh position={[-3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[6, 3, 0.16]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>

      <mesh position={[3, 1.5, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow>
        <boxGeometry args={[6, 3, 0.16]} />
        <meshStandardMaterial color={theme.wall} roughness={0.95} />
      </mesh>

      <mesh position={[0, 3.05, 0]} receiveShadow castShadow>
        <boxGeometry args={[6.2, 0.14, 6.2]} />
        <meshStandardMaterial color={theme.ceiling} roughness={0.95} />
      </mesh>

      <mesh position={[0, 0.8, -2.92]}>
        <boxGeometry args={[1.5, 1.1, 0.05]} />
        <meshStandardMaterial color={theme.accent} roughness={0.45} />
      </mesh>

      <mesh position={[0.75, 0.3, 0.1]} castShadow receiveShadow>
        <boxGeometry args={[2.1, 0.56, 1]} />
        <meshStandardMaterial color={theme.surface} roughness={0.75} />
      </mesh>

      <mesh position={[-0.35, 0.96, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.72, 0.46, 0.95]} />
        <meshStandardMaterial color={theme.surfaceSoft} roughness={0.8} />
      </mesh>

      <mesh position={[1.0, 1.0, -0.25]} castShadow receiveShadow>
        <boxGeometry args={[0.45, 1.35, 0.45]} />
        <meshStandardMaterial color={theme.accent} roughness={0.55} />
      </mesh>

      <mesh position={[-1.45, 0.32, 1.05]} castShadow receiveShadow>
        <cylinderGeometry args={[0.16, 0.18, 0.64, 8]} />
        <meshStandardMaterial color={theme.highlight} roughness={0.55} />
      </mesh>

      <mesh position={[1.95, 0.82, 1.2]} castShadow receiveShadow>
        <boxGeometry args={[0.6, 1.0, 0.6]} />
        <meshStandardMaterial color={theme.surfaceSoft} roughness={0.8} />
      </mesh>

      <mesh position={[1.95, 1.48, 1.2]} castShadow receiveShadow>
        <sphereGeometry args={[0.34, 24, 24]} />
        <meshStandardMaterial color={theme.highlight} roughness={0.4} />
      </mesh>

      <FloatingAccent color={theme.accentInner} />

      <mesh position={[0, 0.02, 2.85]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.2, 0.22]} />
        <meshStandardMaterial color={theme.accent} />
      </mesh>
    </>
  );
}

export function Room3DScreen() {
  const [variant, setVariant] = useState<RoomVariant>("living");
  const theme = useMemo(() => ROOM_THEMES[variant], [variant]);

  return (
    <View style={styles.root}>
      <View style={styles.canvasWrap}>
        <Canvas shadows camera={{ position: [4.6, 3.4, 5.8], fov: 45 }} dpr={[1, 2]}>
          <RoomScene variant={variant} />
          <OrbitControls
            enablePan={false}
            enableZoom
            maxPolarAngle={Math.PI / 2.1}
            minPolarAngle={Math.PI / 5}
            target={[0, 1.1, 0]}
          />
          <Html position={[0, 2.7, 0]} center>
            <div style={{ pointerEvents: "none", userSelect: "none" }}>
              <div style={{
                padding: "6px 10px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.75)",
                color: "#1f2937",
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 0.3
              }}>
                Drag to rotate
              </div>
            </div>
          </Html>
        </Canvas>
      </View>

      <View style={styles.overlay}>
        <View style={styles.panel}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.eyebrow}>ROOM / 3D / WEB</Text>
              <Text style={styles.title}>Interactive room model</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.accent }]}>
              <Ionicons name="cube" size={14} color="#fff" />
            </View>
          </View>

          <Text style={styles.description}>
            Rotate the scene with your mouse or trackpad. This web version uses the same app data pipeline and a
            browser-friendly Three.js canvas.
          </Text>

          <View style={styles.chipRow}>
            {ROOM_LABELS.map((item) => {
              const active = item.key === variant;
              return (
                <Pressable
                  key={item.key}
                  onPress={() => setVariant(item.key)}
                  style={[styles.chip, active && styles.chipActive]}
                >
                  <Ionicons name={item.icon} size={14} color={active ? "#fff" : colors.ink700} />
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{item.title}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background
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
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  description: {
    marginTop: 8,
    color: colors.ink600,
    fontSize: 13,
    lineHeight: 18
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 14
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
  chipText: {
    color: colors.ink700,
    fontSize: 12,
    fontWeight: "600"
  },
  chipTextActive: {
    color: "#fff"
  }
});
