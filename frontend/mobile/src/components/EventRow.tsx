import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device, Event } from "../types/smartHome";

type Props = {
  event: Event;
  device?: Device;
  roomName?: string;
  isFirst?: boolean;
  isLast?: boolean;
};

function timeAgo(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const minutes = Math.max(1, Math.floor(diff / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

type VerbConfig = { label: string; tone: "accent" | "success" | "danger" | "warn" | "info" | "neutral" };
function getVerb(event: Event, device?: Device): VerbConfig {
  if (event.type === "SCENE") return { label: "Ran scene", tone: "info" };
  const isDoor = device?.type === "DOOR";
  switch (event.action) {
    case "TURN_ON":  return { label: "Turned on",  tone: "accent" };
    case "TURN_OFF": return { label: "Turned off", tone: "neutral" };
    case "OPEN":     return { label: isDoor ? "Unlocked" : "Opened", tone: "warn" };
    case "CLOSE":    return { label: isDoor ? "Locked" : "Closed",   tone: "success" };
  }
  return { label: "Updated", tone: "neutral" };
}

const TONE_COLORS: Record<string, { bg: string; fg: string }> = {
  accent:  { bg: colors.accentTint,   fg: colors.accent },
  success: { bg: colors.successSoft,  fg: colors.success },
  danger:  { bg: colors.dangerSoft,   fg: colors.danger },
  warn:    { bg: colors.warnSoft,     fg: colors.warn },
  info:    { bg: colors.infoSoft,     fg: colors.info },
  neutral: { bg: colors.ink100,       fg: colors.ink700 },
};

function getIconName(event: Event, device?: Device): keyof typeof Ionicons.glyphMap {
  if (event.type === "SCENE") return "flash-outline";
  switch (device?.type) {
    case "LIGHT":  return "bulb-outline";
    case "DOOR":   return "lock-closed-outline";
    case "AC":     return "snow-outline";
    case "TEMP":   return "thermometer-outline";
    case "CAMERA": return "videocam-outline";
    case "MOTION": return "walk-outline";
  }
  return "hardware-chip-outline";
}

export function EventRow({ event, device, roomName, isFirst = false, isLast = false }: Props) {
  const verb = getVerb(event, device);
  const tc = TONE_COLORS[verb.tone] ?? TONE_COLORS.neutral;
  const title = event.type === "SCENE" ? (event.scene_name ?? "Scene") : (device?.name ?? "Unknown device");
  // Friendly context instead of the technical "device.cmd.exec" code: where it
  // happened and when. Scenes show how many devices they touched (if known).
  const where = event.type === "SCENE" ? "Scene" : roomName;

  return (
    <View style={styles.row}>
      {/* timeline */}
      <View style={styles.railCol}>
        {!isFirst && <View style={styles.railTop} />}
        {!isLast  && <View style={styles.railBot} />}
        <View style={[styles.railNode, { backgroundColor: tc.bg, borderColor: tc.bg }]}>
          <Ionicons name={getIconName(event, device)} size={11} color={tc.fg} />
        </View>
      </View>

      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={1}>
          <Text style={[styles.verb, { color: tc.fg }]}>{verb.label}</Text>
          {"  "}{title}
        </Text>
        <Text style={styles.meta}>
          {where ? `${where}  ·  ` : ""}{timeAgo(event.timestamp)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
  },
  railCol: {
    width: 22,
    alignItems: "center",
    position: "relative",
    flexShrink: 0,
  },
  railTop: {
    position: "absolute",
    top: -1,
    bottom: "50%",
    width: 1,
    backgroundColor: colors.hairlineStrong,
    left: 10,
  },
  railBot: {
    position: "absolute",
    top: "50%",
    bottom: -1,
    width: 1,
    backgroundColor: colors.hairlineStrong,
    left: 10,
  },
  railNode: {
    marginTop: 12,
    width: 18,
    height: 18,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  body: {
    flex: 1,
    gap: 3,
    justifyContent: "center",
  },
  title: {
    color: colors.ink900,
    fontSize: 14,
    letterSpacing: -0.1,
  },
  verb: {
    fontWeight: "700",
  },
  meta: {
    fontSize: 11.5,
    color: colors.ink500,
  },
});
