import { OrbitControls } from "@react-three/drei/native";
import { Canvas } from "@react-three/fiber/native";
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { Device, DeviceStatus } from "../types/smartHome";

type SceneProps = {
  lightOn: boolean;
  doorOpen: boolean;
  windowOpen: boolean;
  onLightPress: () => void;
  onDoorPress: () => void;
  onWindowPress: () => void;
};

function RoomScene({
  lightOn,
  doorOpen,
  windowOpen,
  onLightPress,
  onDoorPress,
  onWindowPress
}: SceneProps) {
  return (
    <>
      <color attach="background" args={["#dde7f3"]} />
      <fog attach="fog" args={["#dfe8f2", 8, 18]} />

      <ambientLight intensity={lightOn ? 0.5 : 0.25} />
      <directionalLight position={[3, 5, 2]} intensity={0.7} />
      {lightOn ? <pointLight position={[0, 2.25, 0]} intensity={1.5} distance={7} color="#ffd18d" /> : null}

      <group position={[0, -0.45, 0]}>
        <mesh position={[0, -0.03, 0]} receiveShadow>
          <boxGeometry args={[5, 0.06, 5]} />
          <meshStandardMaterial color="#d7dce2" roughness={0.9} />
        </mesh>

        <mesh position={[0, 1.5, -2.47]}>
          <boxGeometry args={[5, 3, 0.06]} />
          <meshStandardMaterial color="#f7fbff" />
        </mesh>
        <mesh position={[-2.47, 1.5, 0]}>
          <boxGeometry args={[0.06, 3, 5]} />
          <meshStandardMaterial color="#f7fbff" />
        </mesh>
        <mesh position={[2.47, 1.5, 0]}>
          <boxGeometry args={[0.06, 3, 5]} />
          <meshStandardMaterial color="#f7fbff" />
        </mesh>

        <mesh position={[0, 3.03, 0]}>
          <boxGeometry args={[5, 0.06, 5]} />
          <meshStandardMaterial color="#edf2f8" />
        </mesh>

        <mesh position={[1.1, 0.22, 0.7]}>
          <boxGeometry args={[1.7, 0.38, 0.9]} />
          <meshStandardMaterial color="#9a6f4e" roughness={0.75} />
        </mesh>
        <mesh position={[1.1, 0.55, 0.7]}>
          <boxGeometry args={[1.6, 0.2, 0.8]} />
          <meshStandardMaterial color="#b48663" />
        </mesh>

        <mesh position={[0, 2.25, 0.8]} onClick={onLightPress}>
          <sphereGeometry args={[0.2, 28, 28]} />
          <meshStandardMaterial color={lightOn ? "#ffd65f" : "#aeb6c2"} emissive={lightOn ? "#ca8f2a" : "#111111"} />
        </mesh>

        <group position={[-1.5, 0.9, -2.43]} rotation={[0, doorOpen ? -Math.PI / 2.2 : 0, 0]}>
          <mesh position={[0.45, 0, 0]} onClick={onDoorPress}>
            <boxGeometry args={[0.9, 1.8, 0.08]} />
            <meshStandardMaterial color="#896248" />
          </mesh>
        </group>

        <group position={[2.43, 1.35, -0.2]} rotation={[0, windowOpen ? -Math.PI / 4 : 0, 0]}>
          <mesh onClick={onWindowPress}>
            <boxGeometry args={[0.08, 1.2, 1.2]} />
            <meshStandardMaterial color="#89afd8" transparent opacity={0.7} />
          </mesh>
        </group>
      </group>

      <OrbitControls enablePan={false} minDistance={3.1} maxDistance={8} minPolarAngle={0.55} maxPolarAngle={1.5} />
    </>
  );
}

function pickByType(devices: Device[], type: Device["type"]): Device | undefined {
  return devices.find((device) => device.type === type);
}

function isOn(status: DeviceStatus | undefined): boolean {
  return status === "ON";
}

function isOpen(status: DeviceStatus | undefined): boolean {
  return status === "OPEN";
}

export function Room3DScreen() {
  const { devices, setDeviceStatus } = useSmartHome();
  const [localWindowOpen, setLocalWindowOpen] = useState(false);

  const lightDevice = useMemo(() => pickByType(devices, "LIGHT"), [devices]);
  const doorDevice = useMemo(() => pickByType(devices, "DOOR"), [devices]);
  const windowDevice = useMemo(() => pickByType(devices, "WINDOW"), [devices]);

  const lightOn = isOn(lightDevice?.status);
  const doorOpen = isOpen(doorDevice?.status);
  const windowOpen = windowDevice ? isOpen(windowDevice.status) : localWindowOpen;

  const toggleLight = useCallback(() => {
    if (!lightDevice) {
      return;
    }
    void setDeviceStatus(lightDevice.id, lightOn ? "OFF" : "ON");
  }, [lightDevice, lightOn, setDeviceStatus]);

  const toggleDoor = useCallback(() => {
    if (!doorDevice) {
      return;
    }
    void setDeviceStatus(doorDevice.id, doorOpen ? "CLOSED" : "OPEN");
  }, [doorDevice, doorOpen, setDeviceStatus]);

  const toggleWindow = useCallback(() => {
    if (!windowDevice) {
      setLocalWindowOpen((prev) => !prev);
      return;
    }
    void setDeviceStatus(windowDevice.id, windowOpen ? "CLOSED" : "OPEN");
  }, [setDeviceStatus, windowDevice, windowOpen]);

  const switchAll = useCallback(
    (next: "ON" | "OFF") => {
      if (lightDevice) {
        void setDeviceStatus(lightDevice.id, next);
      }
      if (doorDevice) {
        void setDeviceStatus(doorDevice.id, next === "ON" ? "OPEN" : "CLOSED");
      }
      if (windowDevice) {
        void setDeviceStatus(windowDevice.id, next === "ON" ? "OPEN" : "CLOSED");
      } else {
        setLocalWindowOpen(next === "ON");
      }
    },
    [doorDevice, lightDevice, setDeviceStatus, windowDevice]
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.canvasWrap}>
        <Canvas camera={{ position: [4.6, 1.8, 4.6], fov: 45 }}>
          <RoomScene
            lightOn={lightOn}
            doorOpen={doorOpen}
            windowOpen={windowOpen}
            onLightPress={toggleLight}
            onDoorPress={toggleDoor}
            onWindowPress={toggleWindow}
          />
        </Canvas>
      </View>

      <View pointerEvents="none" style={styles.hudLayer}>
        <Text style={styles.sceneTitle}>SMART ROOM HUD</Text>
        <Text style={styles.sceneHint}>Tap 3D objects or use quick controls</Text>

        <Pressable
          pointerEvents="auto"
          style={[styles.hudChip, styles.hudChipFirst, lightOn ? styles.hudChipOn : styles.hudChipOff]}
          onPress={toggleLight}
        >
          <Text style={styles.hudChipTitle}>Light</Text>
          <Text style={styles.hudChipState}>{lightOn ? "ON" : "OFF"}</Text>
        </Pressable>

        <Pressable
          pointerEvents="auto"
          style={[styles.hudChip, styles.hudChipSecond, doorOpen ? styles.hudChipOn : styles.hudChipOff]}
          onPress={toggleDoor}
        >
          <Text style={styles.hudChipTitle}>Door</Text>
          <Text style={styles.hudChipState}>{doorOpen ? "OPEN" : "CLOSED"}</Text>
        </Pressable>

        <Pressable
          pointerEvents="auto"
          style={[styles.hudChip, styles.hudChipThird, windowOpen ? styles.hudChipOn : styles.hudChipOff]}
          onPress={toggleWindow}
        >
          <Text style={styles.hudChipTitle}>Window</Text>
          <Text style={styles.hudChipState}>{windowOpen ? "OPEN" : "CLOSED"}</Text>
        </Pressable>
      </View>

      <View style={styles.bottomPanel}>
        <View style={styles.massiveButtons}>
          <Pressable style={styles.bigOn} onPress={() => switchAll("ON")}>
            <Text style={styles.bigButtonText}>POWER ON ALL</Text>
          </Pressable>
          <Pressable style={styles.bigOff} onPress={() => switchAll("OFF")}>
            <Text style={styles.bigButtonText}>POWER OFF ALL</Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  canvasWrap: {
    flex: 1
  },
  hudLayer: {
    ...StyleSheet.absoluteFillObject,
    padding: spacing.md
  },
  sceneTitle: {
    marginTop: 2,
    color: "#10233d",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 0.8
  },
  sceneHint: {
    marginTop: 2,
    color: "#36506f",
    fontSize: 12,
    fontWeight: "600"
  },
  hudChip: {
    position: "absolute",
    left: 16,
    width: 124,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10
  },
  hudChipFirst: {
    top: 104
  },
  hudChipSecond: {
    top: 162
  },
  hudChipThird: {
    top: 220
  },
  hudChipOn: {
    backgroundColor: "rgba(17, 36, 61, 0.82)",
    borderColor: "#8fd8ff"
  },
  hudChipOff: {
    backgroundColor: "rgba(27, 34, 48, 0.72)",
    borderColor: "#6f7f99"
  },
  hudChipTitle: {
    color: "#e5efff",
    fontWeight: "700",
    fontSize: 12
  },
  hudChipState: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 13
  },
  bottomPanel: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.lg
  },
  massiveButtons: {
    flexDirection: "row",
    gap: spacing.sm
  },
  bigOn: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#2f9366",
    paddingVertical: 14,
    alignItems: "center"
  },
  bigOff: {
    flex: 1,
    borderRadius: 14,
    backgroundColor: "#315f9c",
    paddingVertical: 14,
    alignItems: "center"
  },
  bigButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 0.6
  }
});
