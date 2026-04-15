import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { DeviceCard } from "../components/DeviceCard";
import { FilterPill } from "../components/FilterPill";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import type { FilterType } from "../types/smartHome";
import { mapFilterTypeToDeviceType } from "../utils/device";

const filters: Array<{ key: FilterType; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "LIGHT", label: "Lights" },
  { key: "DOOR", label: "Doors" },
  { key: "AC", label: "AC" },
  { key: "TEMP", label: "Sensors" }
];

export function DevicesScreen() {
  const { devices, rooms, isDataLoading, toggleDevice } = useSmartHome();
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  const filteredDevices = useMemo(() => {
    const type = mapFilterTypeToDeviceType(activeFilter);
    if (!type) {
      return devices;
    }

    return devices.filter((device) => device.type === type);
  }, [activeFilter, devices]);

  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.id, room.name])), [rooms]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Text style={typography.h2}>All Devices</Text>
          <Pressable style={styles.filterButton}>
            <Ionicons name="options-outline" size={18} color={colors.textPrimary} />
          </Pressable>
        </View>

        <FlatList
          horizontal
          data={filters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillList}
          renderItem={({ item }) => (
            <FilterPill
              label={item.label}
              isActive={item.key === activeFilter}
              onPress={() => setActiveFilter(item.key)}
            />
          )}
        />

        {isDataLoading ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, index) => (
              <SkeletonBlock key={`device-skeleton-${index}`} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredDevices}
            keyExtractor={(item) => item.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.columnWrap}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No devices yet</Text>
                <Text style={styles.emptyText}>Create a room first, then add devices through the connected backend flow.</Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <DeviceCard
                  device={item}
                  roomName={roomMap.get(item.room_id) ?? "Unknown"}
                  onToggle={() => {
                    void toggleDevice(item.id);
                  }}
                />
              </View>
            )}
          />
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
    paddingTop: spacing.md,
    gap: spacing.md
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center"
  },
  pillList: {
    gap: spacing.sm,
    paddingBottom: spacing.sm
  },
  gridContent: {
    gap: spacing.md,
    paddingBottom: spacing.xxxl
  },
  columnWrap: {
    gap: spacing.md
  },
  cardWrap: {
    flex: 1
  },
  emptyState: {
    paddingTop: spacing.xl,
    alignItems: "center",
    gap: spacing.xs
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 18,
    fontWeight: "700"
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: "center",
    fontSize: 13
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
    paddingBottom: spacing.xxxl
  },
  skeletonCard: {
    width: "48%",
    height: 160,
    borderRadius: 20
  }
});
