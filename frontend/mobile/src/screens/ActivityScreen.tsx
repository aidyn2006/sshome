import { useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { EventRow } from "../components/EventRow";
import { FilterPill } from "../components/FilterPill";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { DateFilter, Event } from "../types/smartHome";

const dateFilters: Array<{ key: DateFilter; label: string }> = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" }
];

type Section = {
  title: string;
  data: Event[];
};

function getCutoff(filter: DateFilter): number {
  const now = Date.now();

  if (filter === "today") {
    return now - 24 * 60 * 60 * 1000;
  }

  if (filter === "week") {
    return now - 7 * 24 * 60 * 60 * 1000;
  }

  return now - 30 * 24 * 60 * 60 * 1000;
}

function groupByTime(events: Event[]): Section[] {
  const now = Date.now();
  const justNow: Event[] = [];
  const oneHourAgo: Event[] = [];
  const yesterday: Event[] = [];

  events.forEach((event) => {
    const diff = now - event.timestamp;

    if (diff <= 15 * 60 * 1000) {
      justNow.push(event);
      return;
    }

    if (diff <= 24 * 60 * 60 * 1000) {
      oneHourAgo.push(event);
      return;
    }

    yesterday.push(event);
  });

  return [
    { title: "JUST NOW", data: justNow },
    { title: "1 HOUR AGO", data: oneHourAgo },
    { title: "YESTERDAY", data: yesterday }
  ].filter((section) => section.data.length > 0);
}

export function ActivityScreen() {
  const { events, devices } = useSmartHome();
  const [dateFilter, setDateFilter] = useState<DateFilter>("today");

  const filteredEvents = useMemo(() => {
    const cutoff = getCutoff(dateFilter);
    return events.filter((event) => event.timestamp >= cutoff);
  }, [events, dateFilter]);

  const sections = useMemo(() => groupByTime(filteredEvents), [filteredEvents]);
  const deviceMap = useMemo(() => new Map(devices.map((device) => [device.id, device])), [devices]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={typography.h2}>Activity</Text>
          <View style={styles.dateFilterWrap}>
            {dateFilters.map((filter) => (
              <FilterPill
                key={filter.key}
                label={filter.label}
                isActive={filter.key === dateFilter}
                onPress={() => setDateFilter(filter.key)}
              />
            ))}
          </View>
        </View>

        {sections.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>🛰️</Text>
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyText}>Actions on your devices will appear here</Text>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.listContainer}>
            {sections.map((section) => (
              <View key={section.title} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <View style={styles.eventsList}>
                  {section.data.map((event) => (
                    <EventRow
                      key={event.id}
                      event={event}
                      device={event.type === "DEVICE" ? deviceMap.get(event.device_id) : undefined}
                    />
                  ))}
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  container: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  headerRow: {
    gap: spacing.md
  },
  dateFilterWrap: {
    flexDirection: "row",
    gap: spacing.sm
  },
  listContainer: {
    gap: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxxl
  },
  section: {
    gap: spacing.sm
  },
  sectionTitle: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8
  },
  eventsList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm
  },
  emptyEmoji: {
    fontSize: 48
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "700"
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13
  }
});
