import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Device, Event } from "../types/smartHome";

type Props = {
  event: Event;
  device?: Device;
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
function getVerb(event: Event): VerbConfig {
  if (event.type === "SCENE") return { label: "EXECUTE", tone: "info" };
  switch (event.action) {
    case "TURN_ON":  return { label: "TURN_ON",  tone: "accent" };
    case "TURN_OFF": return { label: "TURN_OFF", tone: "neutral" };
    case "OPEN":     return { label: "OPEN",     tone: "accent" };
    case "CLOSE":    return { label: "CLOSE",    tone: "neutral" };
  }
  return { label: "UPDATE", tone: "neutral" };
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
  }
  return "hardware-chip-outline";
}

export function EventRow({ event, device, isFirst = false, isLast = false }: Props) {
  const verb = getVerb(event);
  const tc = TONE_COLORS[verb.tone] ?? TONE_COLORS.neutral;
  const title = event.type === "SCENE" ? (event.scene_name ?? "Scene") : (device?.name ?? "Unknown device");
  const code = event.type === "SCENE" ? "scenario.run" : "device.cmd.exec";

  return (
    <View style={styles.row}>
      {/* timeline */}
      <View style={styles.railCol}>
        {!isFirst && <View style={styles.railTop} />}
        {!isLast  && <View style={styles.railBot} />}
        <View style={styles.railNode}>
          <Ionicons name={getIconName(event, device)} size={10} color={colors.ink700} />
        </View>
      </View>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <View style={[styles.verbPill, { backgroundColor: tc.bg }]}>
            <Text style={[styles.verbText, { color: tc.fg }]}>{verb.label}</Text>
          </View>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>
        <Text style={styles.meta}>
          <Text style={styles.code}>{code}</Text>
          {"  ·  "}{timeAgo(event.timestamp)}
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
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  verbPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  verbText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  title: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: "500",
    letterSpacing: -0.1,
    flex: 1,
  },
  meta: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink500,
  },
  code: {
    color: colors.ink600,
  },
});
