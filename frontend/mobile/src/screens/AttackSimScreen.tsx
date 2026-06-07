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

type IncidentTrace = {
  sim_id: string | null;
  attack_type: AttackType;
  launched_at: string;
  summary: Record<string, unknown>;
};

const DDOS_INTENSITY_PRESETS = [
  { label: "Low", value: 10 },
  { label: "Mid", value: 50 },
  { label: "High", value: 150 },
  { label: "Flood", value: 400 }
] as const;

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
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [ddosIntensity, setDdosIntensity] = useState<number>(50);
  const [lastIncidentTrace, setLastIncidentTrace] = useState<IncidentTrace | null>(null);

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

  useEffect(() => {
    if (events.length === 0) {
      return;
    }

    if (!selectedEventId || !events.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(events[0].id);
    }
  }, [events, selectedEventId]);

  const handleLaunch = async (attackType: AttackType) => {
    setRunningAttack(attackType);
    try {
      const result = await simulateAttack({
        attackType,
        intensity: attackType === "DDOS" ? ddosIntensity : undefined
      });
      // Defenses stream in over the WebSocket; pull a snapshot shortly after too,
      // in case the broker round-trip lands after this returns.
      await refresh();
      setTimeout(() => {
        void refresh();
      }, 1500);
      setLastIncidentTrace({
        sim_id: result.sim_id,
        attack_type: result.attack_type,
        launched_at: new Date().toISOString(),
        summary: result.summary
      });
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

  const selectedEvent = useMemo(
    () => events.find((event) => event.id === selectedEventId) ?? null,
    [events, selectedEventId]
  );

  const attackBreakdown = useMemo(() => {
    const counts = stats?.by_type ?? {};
    return Object.entries(counts)
      .map(([type, count]) => ({
        type: type as AttackType,
        count
      }))
      .sort((left, right) => right.count - left.count);
  }, [stats]);

  const traceSummary = useMemo(() => {
    if (!lastIncidentTrace) {
      return [];
    }

    return Object.entries(lastIncidentTrace.summary)
      .filter(([key]) => key !== "attack_type")
      .map(([key, value]) => ({
        key,
        value: String(value)
      }));
  }, [lastIncidentTrace]);

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

        <View style={styles.controlPanel}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>LOAD PROFILE</Text>
              <Text style={styles.sectionTitle}>DDoS intensity</Text>
            </View>
            <Text style={styles.controlHint}>Used only for Telemetry DDoS</Text>
          </View>
          <View style={styles.presetRow}>
            {DDOS_INTENSITY_PRESETS.map((preset) => {
              const active = preset.value === ddosIntensity;
              return (
                <AppPressable
                  key={preset.value}
                  style={[styles.presetChip, active && styles.presetChipActive]}
                  onPress={() => setDdosIntensity(preset.value)}
                >
                  <Text style={[styles.presetLabel, active && styles.presetLabelActive]}>
                    {preset.label}
                  </Text>
                  <Text style={[styles.presetValue, active && styles.presetValueActive]}>
                    {preset.value}
                  </Text>
                </AppPressable>
              );
            })}
          </View>
          <Text style={styles.controlNote}>
            Higher intensity simulates a stronger flood against the telemetry throttle.
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
              <Text style={styles.sectionEyebrow}>INCIDENT TRACE</Text>
              <Text style={styles.sectionTitle}>Why it passed or got blocked</Text>
            </View>
            <Text style={styles.controlHint}>Tap an event below</Text>
          </View>

          {selectedEvent ? (
            <View style={styles.traceCard}>
              <View style={styles.traceHeader}>
                <View style={styles.traceTitleRow}>
                  <View
                    style={[
                      styles.traceBadge,
                      { backgroundColor: selectedEvent.blocked ? colors.successSoft : colors.dangerSoft }
                    ]}
                  >
                    <Ionicons
                      name={selectedEvent.blocked ? "shield-checkmark" : "alert-circle"}
                      size={16}
                      color={selectedEvent.blocked ? colors.success : colors.danger}
                    />
                  </View>
                  <View style={styles.traceHeaderText}>
                    <Text style={styles.traceAttackName}>
                      {ATTACK_LABELS[selectedEvent.attack_type]}
                    </Text>
                    <Text style={styles.traceDecision}>
                      {selectedEvent.blocked ? "Defense matched and blocked it" : "Attack reached the target"}
                    </Text>
                  </View>
                </View>
                <Text style={styles.traceTime}>{formatTime(selectedEvent.created_at)}</Text>
              </View>

              <View style={styles.traceGrid}>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>EVENT ID</Text>
                  <Text style={styles.traceFieldValue}>{selectedEvent.id}</Text>
                </View>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>SIM ID</Text>
                  <Text style={styles.traceFieldValue}>{selectedEvent.sim_id ?? "n/a"}</Text>
                </View>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>TARGET</Text>
                  <Text style={styles.traceFieldValue}>{selectedEvent.target ?? "n/a"}</Text>
                </View>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>SOURCE IP</Text>
                  <Text style={styles.traceFieldValue}>{selectedEvent.source_ip ?? "n/a"}</Text>
                </View>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>SEVERITY</Text>
                  <Text style={[styles.traceFieldValue, { color: severityColor(selectedEvent.severity) }]}>
                    {selectedEvent.severity}
                  </Text>
                </View>
                <View style={styles.traceField}>
                  <Text style={styles.traceFieldLabel}>STATUS</Text>
                  <Text style={[styles.traceFieldValue, { color: selectedEvent.blocked ? colors.success : colors.danger }]}>
                    {selectedEvent.blocked ? "BLOCKED" : "NOT BLOCKED"}
                  </Text>
                </View>
              </View>

              <View style={styles.traceMessageBox}>
                <Text style={styles.traceFieldLabel}>MESSAGE</Text>
                <Text style={styles.traceMessage}>{selectedEvent.message}</Text>
              </View>
            </View>
          ) : (
            <View style={styles.emptyBox}>
              <Ionicons name="analytics-outline" size={18} color={colors.ink400} />
              <Text style={styles.emptyText}>No incident selected yet.</Text>
            </View>
          )}

          {lastIncidentTrace ? (
            <View style={styles.traceSummaryBox}>
              <Text style={styles.traceSummaryTitle}>Latest simulation summary</Text>
              <Text style={styles.traceSummaryMeta}>
                {lastIncidentTrace.attack_type} / {lastIncidentTrace.sim_id ?? "n/a"} /{" "}
                {formatTime(lastIncidentTrace.launched_at)}
              </Text>
              <View style={styles.traceSummaryList}>
                {traceSummary.length === 0 ? (
                  <Text style={styles.traceSummaryEmpty}>No extra summary fields were returned.</Text>
                ) : (
                  traceSummary.map((item) => (
                    <View key={item.key} style={styles.traceSummaryRow}>
                      <Text style={styles.traceSummaryKey}>{item.key}</Text>
                      <Text style={styles.traceSummaryValue}>{item.value}</Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ) : null}
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionEyebrow}>LIVE FEED</Text>
              <Text style={styles.sectionTitle}>Defense activity</Text>
            </View>
            {isLoading ? <ActivityIndicator color={colors.accent} /> : null}
          </View>

          {attackBreakdown.length > 0 ? (
            <View style={styles.breakdownRow}>
              {attackBreakdown.map((item) => (
                <View key={item.type} style={styles.breakdownCard}>
                  <Text style={styles.breakdownValue}>{item.count}</Text>
                  <Text style={styles.breakdownLabel}>{ATTACK_LABELS[item.type]}</Text>
                </View>
              ))}
            </View>
          ) : null}

          {events.length === 0 && !isLoading ? (
            <View style={styles.emptyBox}>
              <Ionicons name="shield-checkmark-outline" size={18} color={colors.ink400} />
              <Text style={styles.emptyText}>No security events yet. Launch an attack above.</Text>
            </View>
          ) : null}

          {events.map((event) => (
            <AppPressable
              key={event.id}
              style={[
                styles.eventRow,
                selectedEventId === event.id && styles.eventRowSelected
              ]}
              onPress={() => setSelectedEventId(event.id)}
            >
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
            </AppPressable>
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
  controlPanel: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 16,
    gap: 12
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
  controlHint: {
    color: colors.ink400,
    fontSize: 11,
    fontFamily: "monospace"
  },
  controlNote: {
    color: colors.ink500,
    fontSize: 12,
    lineHeight: 17
  },
  presetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  presetChip: {
    minWidth: 72,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.cream100,
    alignItems: "center",
    gap: 2
  },
  presetChipActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900
  },
  presetLabel: {
    color: colors.ink500,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4
  },
  presetLabelActive: {
    color: colors.cream50
  },
  presetValue: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: "800"
  },
  presetValueActive: {
    color: colors.cream50
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
  breakdownRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  breakdownCard: {
    minWidth: "47%",
    flexGrow: 1,
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 2
  },
  breakdownValue: {
    color: colors.ink900,
    fontSize: 18,
    fontWeight: "800"
  },
  breakdownLabel: {
    color: colors.ink500,
    fontSize: 11,
    fontWeight: "600"
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
  eventRowSelected: {
    backgroundColor: colors.cream100,
    marginHorizontal: -10,
    paddingHorizontal: 10,
    borderRadius: 8
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
  },
  traceCard: {
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 14,
    gap: 12
  },
  traceHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8
  },
  traceTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    flex: 1
  },
  traceBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center"
  },
  traceHeaderText: {
    flex: 1,
    minWidth: 0
  },
  traceAttackName: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: "800"
  },
  traceDecision: {
    marginTop: 2,
    color: colors.ink600,
    fontSize: 12,
    lineHeight: 16
  },
  traceTime: {
    color: colors.ink400,
    fontFamily: "monospace",
    fontSize: 11
  },
  traceGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  traceField: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    padding: 10,
    gap: 4
  },
  traceFieldLabel: {
    color: colors.ink400,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8
  },
  traceFieldValue: {
    color: colors.ink900,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16
  },
  traceMessageBox: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    padding: 10,
    gap: 4
  },
  traceMessage: {
    color: colors.ink700,
    fontSize: 12.5,
    lineHeight: 17
  },
  traceSummaryBox: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 8,
    padding: 14,
    gap: 10
  },
  traceSummaryTitle: {
    color: colors.ink900,
    fontSize: 16,
    fontWeight: "800"
  },
  traceSummaryMeta: {
    color: colors.ink400,
    fontFamily: "monospace",
    fontSize: 11
  },
  traceSummaryList: {
    gap: 8
  },
  traceSummaryEmpty: {
    color: colors.ink500,
    fontSize: 12
  },
  traceSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8
  },
  traceSummaryKey: {
    color: colors.ink500,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  traceSummaryValue: {
    flex: 1,
    color: colors.ink800,
    fontSize: 12,
    textAlign: "right"
  }
});
