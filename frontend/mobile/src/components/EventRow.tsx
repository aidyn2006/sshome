import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device, Event } from "../types/smartHome";

type Props = {
  event: Event;
  device?: Device;
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60000));

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function getBadge(event: Event): { label: string; color: string } {
  if (event.type === "SCENE") {
    return { label: "SCENE RUN", color: colors.accentBlue };
  }

  switch (event.action) {
    case "ON":
      return { label: "TURNED ON", color: colors.activeGreen };
    case "OFF":
      return { label: "TURNED OFF", color: colors.danger };
    case "OPEN":
      return { label: "UNLOCKED", color: colors.activeGreen };
    case "CLOSE":
      return { label: "LOCKED", color: colors.danger };
  }
}

function getDotColor(event: Event): string {
  if (event.type === "SCENE") {
    return colors.accentBlue;
  }

  if (event.action === "ON" || event.action === "OPEN") {
    return colors.activeGreen;
  }

  return colors.danger;
}

function getIconName(event: Event, device?: Device): keyof typeof Ionicons.glyphMap {
  if (event.type === "SCENE") {
    return "flash-outline";
  }

  if (!device) {
    return "hardware-chip-outline";
  }

  switch (device.type) {
    case "LIGHT":
      return "bulb-outline";
    case "DOOR":
      return "lock-closed-outline";
    case "AC":
      return "snow-outline";
    case "TEMP":
      return "thermometer-outline";
  }
}

export function EventRow({ event, device }: Props) {
  const badge = getBadge(event);
  const title = event.type === "SCENE" ? event.scene_name : device?.name ?? "Unknown device";

  return (
    <View style={styles.row}>
      <View style={styles.timelineColumn}>
        <View style={styles.timelineLine} />
        <View style={[styles.timelineDot, { backgroundColor: getDotColor(event) }]} />
      </View>

      <View style={styles.iconCircle}>
        <Ionicons name={getIconName(event, device)} size={16} color={colors.textPrimary} />
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <View style={[styles.badge, { backgroundColor: `${badge.color}25` }]}>
          <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
        </View>
        <Text style={styles.time}>{timeAgo(event.timestamp)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    gap: 10
  },
  timelineColumn: {
    width: 16,
    alignItems: "center"
  },
  timelineLine: {
    position: "absolute",
    width: 1,
    top: -10,
    bottom: -10,
    backgroundColor: colors.border
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginTop: 8
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flex: 1,
    gap: 4
  },
  title: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: "700"
  },
  badge: {
    borderRadius: 50,
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "700"
  },
  time: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
