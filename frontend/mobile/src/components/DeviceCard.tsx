import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device } from "../types/smartHome";
import { getDeviceIconName, isDeviceActive } from "../utils/device";

type Props = {
  device: Device;
  roomName: string;
  onToggle?: () => void;
};

export function DeviceCard({ device, roomName, onToggle }: Props) {
  const scale = useRef(new Animated.Value(1)).current;
  const active = isDeviceActive(device.status);
  const offline = device.isOnline === false;
  const canToggle = onToggle && !offline;

  const animateTo = (toValue: number) => {
    Animated.spring(scale, { toValue, useNativeDriver: true, speed: 18, bounciness: 6 }).start();
  };

  const statusLabel = device.status;

  return (
    <Animated.View style={[styles.card, offline && styles.cardOffline, { transform: [{ scale }] }]}>
      <Pressable
        onPressIn={() => animateTo(0.97)}
        onPressOut={() => animateTo(1)}
        style={styles.inner}
      >
        {/* top row */}
        <View style={styles.topRow}>
          <View style={[styles.iconBox, active && styles.iconBoxActive]}>
            <Ionicons
              name={getDeviceIconName(device.type, device.status) as keyof typeof Ionicons.glyphMap}
              size={20}
              color={active ? colors.accent : colors.ink600}
            />
          </View>

          {canToggle ? (
            <Pressable
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onToggle();
              }}
              style={[styles.powerBtn, active && styles.powerBtnOn]}
            >
              <Ionicons name="power" size={14} color={active ? colors.cream50 : colors.ink500} />
            </Pressable>
          ) : (
            <View style={[styles.powerBtn, styles.powerBtnReadOnly]}>
              <Ionicons
                name={offline ? "cloud-offline-outline" : "eye-outline"}
                size={14}
                color={colors.ink400}
              />
            </View>
          )}
        </View>

        {/* name + room */}
        <View style={styles.meta}>
          <Text numberOfLines={1} style={styles.name}>{device.name}</Text>
          {device.hardware_id && (
            <Text numberOfLines={1} style={styles.hardwareId}>{device.hardware_id}</Text>
          )}
          <View style={styles.statusRow}>
            <Text style={styles.room}>{roomName}</Text>
            <Text style={styles.dot}>·</Text>
            {offline ? (
              <>
                <View style={styles.offlineDot} />
                <Text style={styles.offlineLabel}>OFFLINE</Text>
              </>
            ) : (
              <>
                <View style={[styles.statusDot, active && styles.statusDotActive]} />
                <Text style={[styles.status, active && styles.statusActive]}>{statusLabel}</Text>
              </>
            )}
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    minHeight: 152,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  cardOffline: {
    opacity: 0.55,
  },
  inner: {
    padding: 14,
    gap: 12,
    flex: 1,
    justifyContent: "space-between",
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
  },
  iconBoxActive: {
    backgroundColor: colors.accentTint,
  },
  powerBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
  },
  powerBtnOn: {
    backgroundColor: colors.ink900,
  },
  powerBtnReadOnly: {
    backgroundColor: colors.ink50 ?? colors.ink100,
    opacity: 0.6,
  },
  meta: {
    gap: 4,
  },
  name: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  room: {
    color: colors.ink500,
    fontSize: 12,
  },
  hardwareId: {
    color: colors.ink400,
    fontFamily: "monospace",
    fontSize: 10.5,
  },
  dot: {
    color: colors.ink300,
    fontSize: 12,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink300,
  },
  statusDotActive: {
    backgroundColor: colors.success,
  },
  status: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink500,
    fontWeight: "500",
  },
  statusActive: {
    color: colors.accent,
  },
  offlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.ink400,
  },
  offlineLabel: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink400,
    fontWeight: "500",
  },
});
