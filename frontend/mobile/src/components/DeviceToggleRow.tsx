import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";
import { useEffect, useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors, gradients } from "../theme/colors";
import type { Device } from "../types/smartHome";
import { getDeviceIconName, isDeviceActive } from "../utils/device";

type Props = {
  device: Device;
  roomName: string;
  onToggle: () => void;
};

export function DeviceToggleRow({ device, roomName, onToggle }: Props) {
  const isActive = isDeviceActive(device.status);
  const thumbX = useRef(new Animated.Value(isActive ? 22 : 2)).current;

  useEffect(() => {
    Animated.spring(thumbX, {
      toValue: isActive ? 22 : 2,
      useNativeDriver: true,
      bounciness: 9,
      speed: 16
    }).start();
  }, [isActive, thumbX]);

  const content = (
    <>
      <View style={styles.leftZone}>
        <View style={[styles.iconWrap, isActive && styles.iconWrapOn]}>
          <Ionicons
            name={getDeviceIconName(device.type, device.status) as keyof typeof Ionicons.glyphMap}
            size={18}
            color={isActive ? colors.accentBlue : colors.textSecondary}
          />
        </View>
        <View>
          <Text style={styles.deviceName}>{device.name}</Text>
          <Text style={styles.roomName}>{roomName}</Text>
        </View>
      </View>

      <Pressable
        onPress={async () => {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onToggle();
        }}
        style={[styles.switchTrack, isActive && styles.switchTrackOn]}
      >
        <Animated.View style={[styles.switchThumb, { transform: [{ translateX: thumbX }] }]} />
      </Pressable>
    </>
  );

  if (isActive) {
    return (
      <LinearGradient colors={gradients.toggleOn} style={[styles.card, styles.cardOn]}>
        {content}
      </LinearGradient>
    );
  }

  return <View style={styles.card}>{content}</View>;
}

const styles = StyleSheet.create({
  card: {
    height: 72,
    borderRadius: 16,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14
  },
  cardOn: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accentBlue
  },
  leftZone: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface
  },
  iconWrapOn: {
    backgroundColor: "rgba(74,144,226,0.15)"
  },
  deviceName: {
    color: colors.textPrimary,
    fontSize: 15,
    fontWeight: "700"
  },
  roomName: {
    color: colors.textSecondary,
    fontSize: 12
  },
  switchTrack: {
    width: 52,
    height: 30,
    borderRadius: 30,
    backgroundColor: colors.inactiveGray,
    justifyContent: "center"
  },
  switchTrackOn: {
    backgroundColor: colors.accentBlue,
    shadowColor: colors.accentBlue,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8
  },
  switchThumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.textOnAccent,
    position: "absolute"
  }
});
