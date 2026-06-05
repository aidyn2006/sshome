import { Ionicons } from "@expo/vector-icons";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "../components/AppPressable";

import type { AttackType, SecurityEvent, SecurityStats } from "../api/security";
import { ScreenHeader } from "../components/ScreenHeader";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";

type AttackMeta = {
  type: AttackType;
  title: string;
  blurb: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const ATTACKS: AttackMeta[] = [
  {
    type: "MQTT_SPOOFING",
    title: "MQTT Spoofing",
    blurb: "Forged telemetry with a wrong secret — checks SHA-256 verification.",
    icon: "swap-horizontal-outline"
  },
  {
    type: "BRUTE_FORCE",
    title: "Brute-force",
    blurb: "Repeated login attempts — checks the login rate limiter.",
    icon: "key-outline"
  },
  {
    type: "REPLAY",
    title: "Replay",
    blurb: "Re-sends a captured valid frame — checks the nonce guard.",
    icon: "repeat-outline"
  },
  {
    type: "DDOS",
    title: "Telemetry DDoS",
    blurb: "Floods the broker — checks the per-device telemetry throttle.",
    icon: "pulse-outline"
  }
];

const ATTACK_LABELS: Record<AttackType, string> = {
  MQTT_SPOOFING: "Spoofing",
  BRUTE_FORCE: "Brute-force",
  REPLAY: "Replay",
  DDOS: "DDoS"
};

function getErrorMessage(error: unknown): string {
  return error instanceof Error && error.message.trim() ? error.message : "Request failed";
}

function severityColor(severity: SecurityEvent["severity"]): string {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return colors.danger;
  }
  if (severity === "MEDIUM") {
    return colors.warn;
  }
  return colors.ink500;
}

function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toLocaleTimeString();
}

export function AttackSimScreen() {
  const { simulateAttack, listSecurityEvents, getSecurityStats, securityEvents } = useSmartHome();

  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [stats, setStats] = useState<SecurityStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [runningAttack, setRunningAttack] = useState<AttackType | null>(null);

  const refresh = useCallback(async () => {
    try {
      const [nextEvents, nextStats] = await Promise.allSettled([
        listSecurityEvents(50),
        getSecurityStats()
      ]);
      if (nextEvents.status === "fulfilled") {
        setEvents(nextEvents.value);
      }
      if (nextStats.status === "fulfilled") {
        setStats(nextStats.value);
      }
    } finally {
      setIsLoading(false);
    }
  }, [listSecurityEvents, getSecurityStats]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  // Merge any events pushed live over the WebSocket into the local list.
  useEffect(() => {
    if (securityEvents.length === 0) {
      return;
    }
    setEvents((prev) => {
      const seen = new Set(prev.map((item) => item.id));
      const fresh = securityEvents.filter((item) => !seen.has(item.id));
      if (fresh.length === 0) {
        return prev;
      }
      return [...fresh, ...prev].slice(0, 100);
    });
  }, [securityEvents]);

  const handleLaunch = async (attackType: AttackType) => {
    setRunningAttack(attackType);
    try {
      const result = await simulateAttack({ attackType });
      // Defenses stream in over the WebSocket; pull a snapshot shortly after too,
      // in case the broker round-trip lands after this returns.
      await refresh();
      setTimeout(() => {
        void refresh();
      }, 1500);
      const summary = result.summary as Record<string, unknown>;
      Alert.alert(
        `${ATTACK_LABELS[attackType]} launched`,
        Object.entries(summary)
          .filter(([key]) => key !== "attack_type")
          .map(([key, value]) => `${key}: ${String(value)}`)
          .join("\n")
      );
    } catch (error) {
      Alert.alert("Simulation failed", getErrorMessage(error));
    } finally {
      setRunningAttack(null);
    }
  };

  const blockedRate = useMemo(() => {
    if (!stats || stats.total === 0) {
      return 0;
    }
    return Math.round((stats.blocked / stats.total) * 100);
  }, [stats]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="RED TEAM"
        title="Attack Sim"
        subtitle="Launch real attacks at your own system and watch the defenses respond."
        secure
        right={
          <AppPressable
            accessibilityRole="button"
            accessibilityLabel="Refresh security feed"
            style={styles.iconButton}
            onPress={() => void refresh()}
          >
            <Ionicons name="refresh" size={17} color={colors.ink700} />
          </AppPressable>
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats?.total ?? 0}</Text>
            <Text style={styles.statLabel}>Events</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.success }]}>{stats?.blocked ?? 0}</Text>
            <Text style={styles.statLabel}>Blocked</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statValue, { color: colors.danger }]}>{stats?.not_blocked ?? 0}</Text>
            <Text style={styles.statLabel}>Got through</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{blockedRate}%</Text>
            <Text style={styles.statLabel}>Defended</Text>
          </View>
        </View>

        <View style={styles.telegramRow}>
          <Ionicons
            name={stats?.telegram_configured ? "paper-plane" : "paper-plane-outline"}
            size={14}
            color={stats?.telegram_configured ? colors.success : colors.ink400}
          />
          <Text style={styles.telegramText}>
            Telegram alerts {stats?.telegram_configured ? "enabled" : "not configured"}
          </Text>
        </View>

        <View style={styles.attackGrid}>
          {ATTACKS.map((attack) => {
            const isRunning = runningAttack === attack.type;
            const disabled = runningAttack !== null;
            return (
              <AppPressable
                key={attack.type}
                accessibilityRole="button"
                disabled={disabled}
                style={[styles.attackCard, disabled && !isRunning && styles.attackCardDisabled]}
                onPress={() => void handleLaunch(attack.type)}
              >
                <View style={styles.attackIcon}>
                  <Ionicons name={attack.icon} size={20} color={colors.danger} />
                </View>
                <Text style={styles.attackTitle}>{attack.title}</Text>
                <Text style={styles.attackBlurb}>{attack.blurb}</Text>
                <View style={styles.attackLaunch}>
                  {isRunning ? (
                    <ActivityIndicator color={colors.danger} />
                  ) : (
                    <>
                      <Ionicons name="flash" size={14} color={colors.danger} />
                      <Text style={styles.attackLaunchText}>Launch</Text>
                    </>
                  )}
                </View>
              </AppPressable>
            );
          })}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>LIVE FEED</Text>
              <Text style={styles.sectionTitle}>Defense activity</Text>
            </View>
            {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          {events.length === 0 && !isLoading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.ink400} />
              <Text style={styles.emptyText}>No security events yet. Launch an attack above.</Text>
            </View>
          ) : null}

          {events.map((event) => (
            <View key={event.id} style={styles.eventRow}>
              <View
                style={[
                  styles.eventStatus,
                  { backgroundColor: event.blocked ? colors.successSoft : colors.dangerSoft }
                ]}
              >
                <Ionicons
                  name={event.blocked ? "shield-checkmark" : "alert-circle"}
                  size={16}
                  color={event.blocked ? colors.success : colors.danger}
                />
              </View>
              <View style={styles.eventMain}>
                <View style={styles.eventTopRow}>
                  <Text style={styles.eventType}>{ATTACK_LABELS[event.attack_type]}</Text>
                  <Text style={[styles.eventSeverity, { color: severityColor(event.severity) }]}>
                    {event.severity}
                  </Text>
                </View>
                <Text style={styles.eventMessage}>{event.message}</Text>
                <Text style={styles.eventMeta}>
                  {event.blocked ? "BLOCKED" : "NOT BLOCKED"}
                  {event.target ? ` / ${event.target}` : ""} {formatTime(event.created_at)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: spacing.md
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center"
  },
  statsRow: {
    flexDirection: "row",
    gap: 8
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
    gap: 2
  },
  statValue: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: "800"
  },
  statLabel: {
    color: colors.ink500,
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.3
  },
  telegramRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2
  },
  telegramText: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: "600"
  },
  attackGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10
  },
  attackCard: {
    width: "47.5%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 14,
    gap: 6
  },
  attackCardDisabled: {
    opacity: 0.5
  },
  attackIcon: {
    width: 38,
    height: 38,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.dangerSoft
  },
  attackTitle: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 2
  },
  attackBlurb: {
    color: colors.ink500,
    fontSize: 11.5,
    lineHeight: 16
  },
  attackLaunch: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
    height: 20
  },
  attackLaunchText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.4
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  sectionEyebrow: {
    color: colors.ink500,
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 1.1
  },
  sectionTitle: {
    marginTop: 3,
    color: colors.ink900,
    fontSize: 20,
    fontWeight: "700"
  },
  emptyBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8
  },
  emptyText: {
    color: colors.ink400,
    fontSize: 13
  },
  eventRow: {
    flexDirection: "row",
    gap: 10,
    paddingVertical: 8,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline
  },
  eventStatus: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center"
  },
  eventMain: {
    flex: 1,
    minWidth: 0
  },
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  eventType: {
    color: colors.ink900,
    fontSize: 13,
    fontWeight: "700"
  },
  eventSeverity: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5
  },
  eventMessage: {
    color: colors.ink600,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2
  },
  eventMeta: {
    color: colors.ink400,
    fontSize: 11,
    fontFamily: "monospace",
    marginTop: 3
  }
});
