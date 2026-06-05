import * as THREE from "three";

import type { Device, DeviceStatus } from "../types/smartHome";

export type RoomVariant = "living" | "bedroom" | "kitchen" | "bathroom" | "office";

export type SceneProps = {
  lightOn: boolean;
  doorOpen: boolean;
  windowOpen: boolean;
  intensity: number;
  onLightPress: () => void;
  onDoorPress: () => void;
  onWindowPress: () => void;
  variant: RoomVariant;
};

type RoomTheme = {
  bg: string;
  fog: string;
  wall: string;
  floor: string;
  ceiling: string;
  trim: string;
  door: string;
  doorPanel: string;
  windowSky: string;
  glass: string;
  accent: string;
  accentInner: string;
  surface: string;
  surfaceSoft: string;
  highlight: string;
  plant: string;
  metal: string;
};

type ThemeSet = {
  day: RoomTheme;
  night: RoomTheme;
};

export const ROOM_THEMES: Record<RoomVariant, ThemeSet> = {
  living: {
    day: {
      bg: "#dbe3ee",
      fog: "#a9b7c8",
      wall: "#e9e4dc",
      floor: "#8a6a4c",
      ceiling: "#f3eee3",
      trim: "#ffffff",
      door: "#c4d0dc",
      doorPanel: "#a6b3c2",
      windowSky: "#a9c5e6",
      glass: "#b7d8ec",
      accent: "#2563eb",
      accentInner: "#1d4fce",
      surface: "#2a2a2a",
      surfaceSoft: "#6b7a8a",
      highlight: "#8da3b8",
      plant: "#2d6e3a",
      metal: "#c7a45a"
    },
    night: {
      bg: "#0e1218",
      fog: "#111827",
      wall: "#1b2230",
      floor: "#252033",
      ceiling: "#151a24",
      trim: "#303947",
      door: "#243246",
      doorPanel: "#31445f",
      windowSky: "#2e4760",
      glass: "#5b8db8",
      accent: "#153f9f",
      accentInner: "#102f78",
      surface: "#111827",
      surfaceSoft: "#263244",
      highlight: "#334358",
      plant: "#25583c",
      metal: "#9f7d4b"
    }
  },
  bedroom: {
    day: {
      bg: "#e6e0ea",
      fog: "#c7bfd0",
      wall: "#f3edf6",
      floor: "#8d5f4a",
      ceiling: "#fbf8fc",
      trim: "#ffffff",
      door: "#d7c7d6",
      doorPanel: "#c4b0c6",
      windowSky: "#d4e3f6",
      glass: "#dbe9f7",
      accent: "#8b5cf6",
      accentInner: "#6d28d9",
      surface: "#61486c",
      surfaceSoft: "#9a8aa8",
      highlight: "#d7c8e2",
      plant: "#5f8a59",
      metal: "#c7a45a"
    },
    night: {
      bg: "#14111c",
      fog: "#1f1a2b",
      wall: "#211c30",
      floor: "#2b1d2b",
      ceiling: "#181321",
      trim: "#33294a",
      door: "#2d2738",
      doorPanel: "#3d3550",
      windowSky: "#283650",
      glass: "#6b82b7",
      accent: "#7c3aed",
      accentInner: "#5b21b6",
      surface: "#3b2c4f",
      surfaceSoft: "#564165",
      highlight: "#7e6b93",
      plant: "#2d6546",
      metal: "#8f6b45"
    }
  },
  kitchen: {
    day: {
      bg: "#eaf1e7",
      fog: "#c9d7c5",
      wall: "#f6fbf5",
      floor: "#9a7b55",
      ceiling: "#fcfff8",
      trim: "#ffffff",
      door: "#d6e2d2",
      doorPanel: "#c6d5c0",
      windowSky: "#c9e6ff",
      glass: "#d7efff",
      accent: "#f59e0b",
      accentInner: "#d97706",
      surface: "#4b5563",
      surfaceSoft: "#9ca3af",
      highlight: "#f3d8a7",
      plant: "#4b7f46",
      metal: "#b7c2cc"
    },
    night: {
      bg: "#11161a",
      fog: "#182128",
      wall: "#20292c",
      floor: "#29201a",
      ceiling: "#151b1f",
      trim: "#2e3840",
      door: "#263238",
      doorPanel: "#35434a",
      windowSky: "#284055",
      glass: "#6b94b8",
      accent: "#ea8a1a",
      accentInner: "#b45309",
      surface: "#3c4751",
      surfaceSoft: "#697480",
      highlight: "#bd9f6f",
      plant: "#31593a",
      metal: "#9aa7b2"
    }
  },
  bathroom: {
    day: {
      bg: "#e8f2f7",
      fog: "#c7dbe6",
      wall: "#f7fbfd",
      floor: "#8f7d6c",
      ceiling: "#fcfeff",
      trim: "#ffffff",
      door: "#d5e2ea",
      doorPanel: "#bfd0db",
      windowSky: "#d4ebfb",
      glass: "#e2f3ff",
      accent: "#14b8a6",
      accentInner: "#0f766e",
      surface: "#475569",
      surfaceSoft: "#a8bac6",
      highlight: "#d8e6ee",
      plant: "#3f7b4e",
      metal: "#cbd5e1"
    },
    night: {
      bg: "#0f141a",
      fog: "#17212a",
      wall: "#1c2730",
      floor: "#2a211d",
      ceiling: "#12171d",
      trim: "#2c3944",
      door: "#26313b",
      doorPanel: "#354554",
      windowSky: "#28445b",
      glass: "#6b97bf",
      accent: "#2dd4bf",
      accentInner: "#0f766e",
      surface: "#334155",
      surfaceSoft: "#62707e",
      highlight: "#90a4b4",
      plant: "#2b6a46",
      metal: "#94a3b8"
    }
  },
  office: {
    day: {
      bg: "#dee6ef",
      fog: "#bfc9d4",
      wall: "#eff4f9",
      floor: "#6f5a47",
      ceiling: "#f8fbff",
      trim: "#ffffff",
      door: "#cad4df",
      doorPanel: "#aeb9c7",
      windowSky: "#bfd8f7",
      glass: "#d4e4f6",
      accent: "#0f766e",
      accentInner: "#115e59",
      surface: "#24303d",
      surfaceSoft: "#64748b",
      highlight: "#91a8be",
      plant: "#2f6b3d",
      metal: "#c7a45a"
    },
    night: {
      bg: "#0d1318",
      fog: "#111a22",
      wall: "#17202a",
      floor: "#1f1815",
      ceiling: "#11161c",
      trim: "#2c3640",
      door: "#1f2a36",
      doorPanel: "#2f3d4d",
      windowSky: "#22354a",
      glass: "#5b84b2",
      accent: "#14b8a6",
      accentInner: "#0f766e",
      surface: "#1f2937",
      surfaceSoft: "#475569",
      highlight: "#64748b",
      plant: "#25583c",
      metal: "#8b7355"
    }
  }
};

export function getRoomVariant(name: string | undefined, index: number): RoomVariant {
  const normalized = name?.trim().toLowerCase() ?? "";

  if (normalized.includes("bed")) return "bedroom";
  if (normalized.includes("kit")) return "kitchen";
  if (normalized.includes("bath")) return "bathroom";
  if (normalized.includes("office") || normalized.includes("study")) return "office";
  if (normalized.includes("living") || normalized.includes("hall")) return "living";

  const cycle: RoomVariant[] = ["living", "bedroom", "kitchen", "bathroom", "office"];
  return cycle[Math.max(0, index) % cycle.length];
}

export function pickByType(
  devices: Device[],
  type: Device["type"],
  roomId?: string | null
): Device | undefined {
  if (roomId) {
    return devices.find((d) => d.type === type && d.room_id === roomId);
  }

  return devices.find((d) => d.type === type);
}

export function isOn(status: DeviceStatus | undefined) {
  return status === "ON";
}

export function isOpen(status: DeviceStatus | undefined) {
  return status === "OPEN";
}

export function clampIntensity(value: number) {
  return Math.max(0, Math.min(100, Math.round(value / 5) * 5));
}

export function RoomScene({
  lightOn,
  doorOpen,
  windowOpen,
  intensity,
  onLightPress,
  onDoorPress,
  onWindowPress,
  variant,
}: SceneProps) {
  const k = intensity / 100;
  const palette = lightOn ? ROOM_THEMES[variant].day : ROOM_THEMES[variant].night;

  return (
    <>
      <color attach="background" args={[palette.bg]} />
      <fog attach="fog" args={[palette.fog, 12, 28]} />

      <ambientLight intensity={lightOn ? 0.36 + 0.12 * k : 0.26} />
      <hemisphereLight
        args={[lightOn ? "#f4ead8" : "#3a4a6a", palette.floor, lightOn ? 0.45 : 0.3]}
      />
      <directionalLight
        position={[-4, 6, -4]}
        intensity={lightOn ? 0.62 : 0.46}
        color={lightOn ? "#c9ddf5" : "#7ea3d7"}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-near={1}
        shadow-camera-far={22}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-bias={-0.0004}
      />
      <pointLight
        position={[0, 2.7, 0]}
        intensity={lightOn ? 1.6 * k + 0.35 : 0.18}
        distance={10}
        decay={1.3}
        color={lightOn ? "#ffd6a0" : "#5f7fb8"}
        castShadow={lightOn}
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
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
            <meshBasicMaterial color={palette.windowSky} />
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
              <meshStandardMaterial color={doorOpen ? palette.accent : palette.door} roughness={0.52} />
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
        {variant === "living" && (
          <group position={[0.3, 0, -1.3]}>
            <mesh position={[0, 0.225, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.2, 0.45, 0.85]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.85} />
            </mesh>
            <mesh position={[0, 0.6, -0.31]} castShadow>
              <boxGeometry args={[2.2, 0.7, 0.22]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.85} />
            </mesh>
            <mesh position={[-1, 0.5, 0]} castShadow>
              <boxGeometry args={[0.18, 0.55, 0.85]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.85} />
            </mesh>
            <mesh position={[1, 0.5, 0]} castShadow>
              <boxGeometry args={[0.18, 0.55, 0.85]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.85} />
            </mesh>
            {[-0.5, 0.5].map((x) => (
              <mesh key={`cushion-${x}`} position={[x, 0.525, 0.05]} castShadow>
                <boxGeometry args={[0.95, 0.15, 0.65]} />
                <meshStandardMaterial color={palette.highlight} roughness={0.85} />
              </mesh>
            ))}
            <mesh position={[-0.7, 0.7, -0.12]} rotation={[0, 0, 0.2]} castShadow>
              <boxGeometry args={[0.4, 0.3, 0.15]} />
              <meshStandardMaterial color="#e8a26c" roughness={0.9} />
            </mesh>
            <mesh position={[0.3, 0.007, -0.2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.6, 1.6]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
            <mesh position={[0.3, 0.009, -0.2]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.2, 1.2]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.95} />
            </mesh>
            <mesh position={[0.3, 0.42, -0.2]} castShadow>
              <boxGeometry args={[1, 0.05, 0.55]} />
              <meshStandardMaterial color={palette.surface} roughness={0.6} metalness={0.2} />
            </mesh>
            {[[-0.18, -0.25], [0.18, -0.25], [-0.18, 0.25], [0.18, 0.25]].map(([dx, dz]) => (
              <mesh key={`leg-${dx}-${dz}`} position={[0.3 + dx, 0.2, -0.2 + dz]} castShadow>
                <boxGeometry args={[0.04, 0.4, 0.04]} />
                <meshStandardMaterial color={palette.surface} roughness={0.6} metalness={0.2} />
              </mesh>
            ))}
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
            <mesh position={[-1.8, 0.55, -1.4]} castShadow>
              <cylinderGeometry args={[0.25, 0.25, 0.04, 16]} />
              <meshStandardMaterial color={palette.surface} roughness={0.6} metalness={0.2} />
            </mesh>
            <mesh position={[-1.8, 0.275, -1.4]}>
              <cylinderGeometry args={[0.025, 0.025, 0.55, 8]} />
              <meshStandardMaterial color={palette.surface} roughness={0.6} />
            </mesh>
            <mesh position={[-1.8, 0.59, -1.4]}>
              <cylinderGeometry args={[0.08, 0.1, 0.04, 12]} />
              <meshStandardMaterial color={palette.metal} roughness={0.6} />
            </mesh>
            <mesh position={[-1.8, 0.76, -1.4]}>
              <cylinderGeometry args={[0.012, 0.012, 0.3, 8]} />
              <meshStandardMaterial color={palette.metal} roughness={0.6} />
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
        )}

        {variant === "bedroom" && (
          <group position={[0.3, 0, -1.1]}>
            <mesh position={[0, 0.24, 0]} castShadow receiveShadow>
              <boxGeometry args={[2.3, 0.48, 1.15]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.92} />
            </mesh>
            <mesh position={[0, 0.64, -0.52]} castShadow>
              <boxGeometry args={[2.3, 0.75, 0.25]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.92} />
            </mesh>
            <mesh position={[-0.75, 0.8, -0.2]} castShadow>
              <boxGeometry args={[0.75, 0.22, 0.55]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.9} />
            </mesh>
            <mesh position={[1.2, 0.95, 1.65]} castShadow>
              <boxGeometry args={[0.55, 1.8, 0.45]} />
              <meshStandardMaterial color={palette.surface} roughness={0.8} />
            </mesh>
            <mesh position={[2.0, 0.9, 1.65]} castShadow>
              <boxGeometry args={[0.35, 1.6, 0.35]} />
              <meshStandardMaterial color={palette.surface} roughness={0.8} />
            </mesh>
            <mesh position={[-2.0, 0.52, 1.6]} castShadow>
              <cylinderGeometry args={[0.14, 0.16, 0.35, 14]} />
              <meshStandardMaterial color={palette.accent} roughness={0.85} />
            </mesh>
            <mesh position={[-2.0, 0.72, 1.6]} castShadow>
              <cylinderGeometry args={[0.06, 0.08, 0.35, 12, 1, true]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.6} side={THREE.DoubleSide} />
            </mesh>
            <mesh position={[0.3, 0.007, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.7, 1.8]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
            <mesh position={[0.3, 0.009, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.3, 1.4]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.95} />
            </mesh>
          </group>
        )}

        {variant === "kitchen" && (
          <group position={[0, 0, -0.15]}>
            <mesh position={[0.25, 0.48, 0.15]} castShadow>
              <boxGeometry args={[2.4, 0.96, 0.75]} />
              <meshStandardMaterial color={palette.surface} roughness={0.7} />
            </mesh>
            <mesh position={[0.25, 0.97, 0.15]} castShadow>
              <boxGeometry args={[2.5, 0.08, 0.85]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.5} />
            </mesh>
            <mesh position={[-1.6, 1.0, -1.25]} castShadow>
              <boxGeometry args={[0.55, 1.8, 0.55]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.8} />
            </mesh>
            <mesh position={[1.7, 0.95, -1.25]} castShadow>
              <boxGeometry args={[0.4, 1.9, 0.5]} />
              <meshStandardMaterial color={palette.accent} roughness={0.9} />
            </mesh>
            <mesh position={[-0.85, 0.78, 1.55]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.75} />
            </mesh>
            <mesh position={[0.15, 0.78, 1.55]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.75} />
            </mesh>
            <mesh position={[1.15, 0.78, 1.55]} castShadow>
              <cylinderGeometry args={[0.13, 0.13, 0.5, 16]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.75} />
            </mesh>
            <mesh position={[0.35, 0.007, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.7, 1.8]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
            <mesh position={[0.35, 0.009, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.2, 1.3]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.95} />
            </mesh>
          </group>
        )}

        {variant === "bathroom" && (
          <group position={[0.05, 0, -0.15]}>
            <mesh position={[-1.1, 0.42, -0.35]} castShadow>
              <boxGeometry args={[1.25, 0.08, 0.72]} />
              <meshStandardMaterial color={palette.surface} roughness={0.7} />
            </mesh>
            <mesh position={[-1.1, 0.26, -0.35]} castShadow>
              <boxGeometry args={[1.18, 0.34, 0.62]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.8} />
            </mesh>
            <mesh position={[1.35, 0.72, -1.2]} castShadow>
              <cylinderGeometry args={[0.42, 0.46, 0.95, 18]} />
              <meshStandardMaterial color={palette.glass} roughness={0.2} metalness={0.1} transparent opacity={0.92} />
            </mesh>
            <mesh position={[1.35, 0.45, -1.2]} castShadow>
              <cylinderGeometry args={[0.38, 0.38, 0.1, 18]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.5} />
            </mesh>
            <mesh position={[-1.75, 1.0, 1.5]} castShadow>
              <boxGeometry args={[0.65, 0.95, 0.12]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.3} />
            </mesh>
            <mesh position={[-1.75, 1.48, 1.42]} castShadow>
              <boxGeometry args={[0.65, 0.02, 0.1]} />
              <meshStandardMaterial color={palette.accent} roughness={0.2} />
            </mesh>
            <mesh position={[-1.15, 0.62, 1.55]} castShadow>
              <boxGeometry args={[0.55, 0.55, 0.35]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.8} />
            </mesh>
            <mesh position={[-1.15, 0.94, 1.36]} castShadow>
              <boxGeometry args={[0.42, 0.22, 0.02]} />
              <meshStandardMaterial color={palette.glass} roughness={0.15} transparent opacity={0.9} />
            </mesh>
            <mesh position={[-1.15, 0.36, 1.55]} castShadow>
              <boxGeometry args={[0.55, 0.07, 0.35]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.6} />
            </mesh>
            <mesh position={[0.15, 0.03, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.2, 1.35]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
            <mesh position={[0.15, 0.04, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[1.7, 1.0]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.95} />
            </mesh>
          </group>
        )}

        {variant === "office" && (
          <group position={[0.05, 0, -0.18]}>
            <mesh position={[-0.2, 0.52, -0.35]} castShadow>
              <boxGeometry args={[1.7, 0.08, 0.75]} />
              <meshStandardMaterial color={palette.surface} roughness={0.65} />
            </mesh>
            <mesh position={[-0.2, 0.28, -0.35]} castShadow>
              <boxGeometry args={[1.55, 0.44, 0.55]} />
              <meshStandardMaterial color={palette.surfaceSoft} roughness={0.85} />
            </mesh>
            <mesh position={[-1.5, 0.95, 1.45]} castShadow>
              <boxGeometry args={[0.6, 1.8, 0.5]} />
              <meshStandardMaterial color={palette.accent} roughness={0.82} />
            </mesh>
            <mesh position={[1.7, 1.0, 1.5]} castShadow>
              <boxGeometry args={[0.45, 2.0, 0.45]} />
              <meshStandardMaterial color={palette.surface} roughness={0.82} />
            </mesh>
            <mesh position={[0.55, 0.72, -0.35]} castShadow>
              <cylinderGeometry args={[0.22, 0.24, 0.45, 12]} />
              <meshStandardMaterial color={palette.highlight} roughness={0.8} />
            </mesh>
            <mesh position={[0.35, 0.007, -0.15]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[2.5, 1.7]} />
              <meshStandardMaterial color={palette.accent} roughness={0.95} />
            </mesh>
            <mesh position={[0.35, 0.009, -0.15]} rotation={[-Math.PI / 2, 0, 0]}>
              <planeGeometry args={[2.1, 1.25]} />
              <meshStandardMaterial color={palette.accentInner} roughness={0.95} />
            </mesh>
            <mesh position={[0.4, 0.85, -0.2]} castShadow>
              <boxGeometry args={[0.28, 0.18, 0.03]} />
              <meshStandardMaterial color="#0f172a" roughness={0.25} />
            </mesh>
            <mesh position={[0.95, 0.83, -0.2]} castShadow>
              <boxGeometry args={[0.18, 0.2, 0.02]} />
              <meshStandardMaterial color="#94a3b8" roughness={0.35} />
            </mesh>
          </group>
        )}
      </group>
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
