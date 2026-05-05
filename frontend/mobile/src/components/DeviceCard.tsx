import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device } from "../types/smartHome";
import { getDeviceIconName, getStatusLabel, isDeviceActive } from "../utils/device";

type Props = {
  device: Device;
  roomName: string;
  onToggle: () => void;
};

function getTypeColor(type: Device["type"]): string {
  switch (type) {
    case "LIGHT":
      return "rgba(245,166,35,0.25)";
    case "DOOR":
      return "rgba(74,144,226,0.25)";
    case "WINDOW":
      return "rgba(106,193,255,0.24)";
    case "AC":
      return "rgba(40,198,200,0.25)";
    case "TEMP":
      return "rgba(255,107,107,0.25)";
  }
}

export function DeviceCard({ device, roomName, onToggle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const active = isDeviceActive(device.status);

  const animateTo = (toValue: number) => {
    Animated.spring(scale, {
      toValue,
      useNativeDriver: true,
      speed: 16,
      bounciness: 8
    }).start();
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}> 
      <Pressable
        onPressIn={() => animateTo(0.96)}
        onPressOut={() => animateTo(1)}
        style={styles.inner}
      >
        <View style={[styles.iconCircle, { backgroundColor: getTypeColor(device.type) }]}>
          <Ionicons
            name={getDeviceIconName(device.type, device.status) as keyof typeof Ionicons.glyphMap}
            size={24}
            color={colors.textPrimary}
          />
        </View>

        <Text numberOfLines={1} style={styles.name}>
          {device.name}
        </Text>
        <Text style={styles.room}>{roomName}</Text>

        <View style={[styles.badge, active ? styles.badgeOn : styles.badgeOff]}>
          <Text style={[styles.badgeText, active ? styles.badgeTextOn : styles.badgeTextOff]}>
            {getStatusLabel(device.status)}
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onToggle();
          }}
          style={[styles.powerButton, active && styles.powerButtonOn]}
        >
          <Ionicons name="power" size={18} color={colors.textOnAccent} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 160,
    maxWidth: "100%"
  },
  inner: {
    padding: 12,
    gap: 8,
    flex: 1
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center"
  },
  name: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  room: {
    color: colors.textSecondary,
    fontSize: 12
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 50,
    paddingHorizontal: 10,
    paddingVertical: 4
  },
  badgeOn: {
    backgroundColor: "rgba(46,204,113,0.2)"
  },
  badgeOff: {
    backgroundColor: "rgba(148,163,184,0.22)"
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  badgeTextOn: {
    color: colors.activeGreen
  },
  badgeTextOff: {
    color: colors.textSecondary
  },
  powerButton: {
    marginTop: "auto",
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.inactiveGray,
    alignItems: "center",
    justifyContent: "center"
  },
  powerButtonOn: {
    backgroundColor: colors.accentBlue
  }
});
