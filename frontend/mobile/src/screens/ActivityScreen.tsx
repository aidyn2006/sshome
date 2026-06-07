import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";

import { AppPressable } from "../components/AppPressable";
import { EventRow } from "../components/EventRow";
import { FilterPill } from "../components/FilterPill";
import { ScreenHeader } from "../components/ScreenHeader";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { DateFilter, Event } from "../types/smartHome";

const DATE_FILTERS: Array<{ key: DateFilter; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week",  label: "Week" },
  { key: "month", label: "Month" },
];

const SOURCE_FILTERS = ["ALL", "MANUAL", "SCENARIO"] as const;

type Section = { title: string; data: Event[] };
type SourceFilter = typeof SOURCE_FILTERS[number];

function getCutoff(filter: DateFilter): number {
  const now = Date.now();
  if (filter === "today") return now - 86400000;
  if (filter === "week")  return now - 86400000 * 7;
  return now - 86400000 * 30;
}

function groupByTime(events: Event[]): Section[] {
  const now = Date.now();
  const justNow: Event[] = [];
  const oneHour: Event[] = [];
  const yesterday: Event[] = [];
  events.forEach((e) => {
    const diff = now - e.timestamp;
    if (diff <= 900000) { justNow.push(e); return; }
    if (diff <= 86400000) { oneHour.push(e); return; }
    yesterday.push(e);
  });
  return [
    { title: "JUST NOW",    data: justNow },
    { title: "1 HOUR AGO",  data: oneHour },
    { title: "YESTERDAY",   data: yesterday },
  ].filter((s) => s.data.length > 0);
}

function getEventSource(event: Event): Exclude<SourceFilter, "ALL"> {
  return event.type === "SCENE" ? "SCENARIO" : "MANUAL";
}

export function ActivityScreen() {
  const { events, devices, rooms, isDataLoading } = useSmartHome();
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("ALL");

  const filtered = useMemo(() => {
    const cutoff = getCutoff(dateFilter);
    return events.filter((e) => {
      if (e.timestamp < cutoff) return false;
      if (sourceFilter !== "ALL" && getEventSource(e) !== sourceFilter) return false;
      return true;
    });
  }, [dateFilter, events, sourceFilter]);

  const sections = useMemo(() => groupByTime(filtered), [filtered]);
  const deviceMap = useMemo(() => new Map(devices.map((d) => [d.id, d])), [devices]);
  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const counts = useMemo(() => ({
    total:    events.length,
    manual:   events.filter((e) => getEventSource(e) === "MANUAL").length,
    scenario: events.filter((e) => getEventSource(e) === "SCENARIO").length,
  }), [events]);

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="AUDIT LOG"
        title="Activity"
        subtitle="A record of every action on this home."
        secure
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Period segmented control */}
        <View style={styles.segment}>
          {DATE_FILTERS.map((f) => {
            const on = f.key === dateFilter;
            return (
              <AppPressable key={f.key} onPress={() => setDateFilter(f.key)} style={[styles.segItem, on && styles.segItemActive]}>
                <Text style={[styles.segText, on && styles.segTextActive]}>{f.label}</Text>
              </AppPressable>
            );
          })}
        </View>

        {/* Stat strip */}
        <View style={styles.statStrip}>
          <LogStat label="Total"    value={counts.total}    accent={colors.ink900} />
          <View style={styles.statDiv} />
          <LogStat label="Manual"   value={counts.manual}   accent={colors.accent} />
          <View style={styles.statDiv} />
          <LogStat label="Scenario" value={counts.scenario} accent={colors.info} />
        </View>

        {/* Source filter pills */}
        <View style={styles.pillRow}>
          {SOURCE_FILTERS.map((s) => (
            <FilterPill
              key={s}
              label={s === "ALL" ? "All sources" : s.charAt(0) + s.slice(1).toLowerCase()}
              isActive={sourceFilter === s}
              onPress={() => setSourceFilter(s)}
            />
          ))}
        </View>

        {/* Event groups */}
        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIcon}>
              <Ionicons name="pulse-outline" size={26} color={colors.ink500} />
            </View>
            <Text style={styles.emptyTitle}>{isDataLoading ? "Loading…" : "Quiet hour"}</Text>
            <Text style={styles.emptyText}>No events in this window.</Text>
          </View>
        ) : (
          sections.map(({ title, data }) => (
            <View key={title} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLabel}>{title}</Text>
                <View style={styles.groupLine} />
                <Text style={styles.groupCount}>{data.length}</Text>
              </View>
              {data.map((e, i) => {
                const dev = e.type === "DEVICE" ? deviceMap.get(e.device_id) : undefined;
                return (
                  <EventRow
                    key={e.id}
                    event={e}
                    device={dev}
                    roomName={dev ? roomMap.get(dev.room_id) : undefined}
                    isFirst={i === 0}
                    isLast={i === data.length - 1}
                  />
                );
              })}
            </View>
          ))
        )}

      </ScrollView>
    </View>
  );
}

function LogStat({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <View style={styles.statCell}>
      <Text style={[styles.statValue, { color: accent }]}>{String(value).padStart(2, "0")}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 120,
    gap: spacing.md,
  },
  segment: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    backgroundColor: colors.ink100,
    borderRadius: 999,
  },
  segItem: {
    flex: 1,
    height: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  segItemActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  segText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink500,
  },
  segTextActive: {
    color: colors.ink900,
    fontWeight: "600",
  },
  statStrip: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statDiv: {
    width: 0.5,
    backgroundColor: colors.hairlineStrong,
    marginVertical: 2,
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "500",
    lineHeight: 22,
  },
  statLabel: {
    fontFamily: "monospace",
    fontSize: 9.5,
    color: colors.ink500,
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  group: {
    gap: 2,
    marginTop: 6,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 2,
  },
  groupLabel: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  groupLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.hairlineStrong,
  },
  groupCount: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink400,
  },
  emptyState: {
    paddingTop: 48,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: colors.ink900,
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyText: {
    color: colors.ink500,
    textAlign: "center",
    fontSize: 13.5,
  },
});
