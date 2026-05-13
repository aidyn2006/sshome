import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device } from "../types/smartHome";
import { getDeviceIconName, isDeviceActive } from "../utils/device";

type Props = {
  device: Device;
  roomName: string;
  onToggle: () => void;
};

export function DeviceToggleRow({ device, roomName, onToggle }: Props) {
  const isActive = isDeviceActive(device.status);
  const thumbX = useRef(new Animated.Value(isActive ? 20 : 2)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: isActive ? 20 : 2,
      useNativeDriver: true,
      bounciness: 8,
      speed: 18,
    }).start();
  }, [isActive, thumbX]);

  return (
    <View style={styles.row}>
      <View style={[styles.iconBox, isActive && styles.iconBoxActive]}>
        <Ionicons
          name={getDeviceIconName(device.type, device.status) as keyof typeof Ionicons.glyphMap}
          size={17}
          color={isActive ? colors.accent : colors.ink600}
        />
      </View>

      <View style={styles.labels}>
        <Text style={styles.name} numberOfLines={1}>{device.name}</Text>
        <Text style={styles.status}>{device.status}</Text>
      </View>

      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={[styles.track, isActive && styles.trackActive]}
      >
        <Animated.View style={[styles.thumb, { transform: [{ translateX: thumbX }] }]} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
    flexShrink: 0,
  },
  iconBoxActive: {
    backgroundColor: colors.accentTint,
  },
  labels: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.ink900,
    fontSize: 14.5,
    fontWeight: "500",
  },
  status: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink500,
    marginTop: 1,
  },
  track: {
    width: 46,
    height: 28,
    borderRadius: 999,
    backgroundColor: colors.ink200,
    justifyContent: "center",
    flexShrink: 0,
  },
  trackActive: {
    backgroundColor: colors.accent,
  },
  thumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
});
