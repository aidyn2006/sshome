import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { FlatList, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";

import { DeviceCard } from "../components/DeviceCard";
import { FilterPill } from "../components/FilterPill";
import { ScreenHeader } from "../components/ScreenHeader";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { FilterType } from "../types/smartHome";
import { mapFilterTypeToDeviceType } from "../utils/device";

const FILTERS: Array<{ key: FilterType; label: string }> = [
  { key: "ALL",    label: "All" },
  { key: "LIGHT",  label: "Lights" },
  { key: "DOOR",   label: "Doors" },
  { key: "AC",     label: "Climate" },
  { key: "TEMP",   label: "Sensors" },
  { key: "CAMERA", label: "Cameras" },
  { key: "MOTION", label: "Motion" },
];

export function DevicesScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { devices, rooms, isDataLoading, toggleDevice } = useSmartHome();
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [query, setQuery] = useState("");
  const [editMode, setEditMode] = useState(false);

  const filteredDevices = useMemo(() => {
    const type = mapFilterTypeToDeviceType(activeFilter);
    return devices.filter((d) => {
      if (type && d.type !== type) return false;
      if (query && !d.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [activeFilter, devices, query]);

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { ALL: devices.length };
    FILTERS.slice(1).forEach((f) => {
      const type = mapFilterTypeToDeviceType(f.key);
      c[f.key] = type ? devices.filter((d) => d.type === type).length : 0;
    });
    return c;
  }, [devices]);

  const activeCount = useMemo(
    () => devices.filter((d) => d.status === "ON" || d.status === "OPEN").length,
    [devices]
  );

  return (
    <View style={styles.screen}>
      <ScreenHeader
        eyebrow="INVENTORY"
        title="Devices"
        subtitle={`${activeCount} of ${devices.length} active`}
        secure
        right={
          <View style={styles.headerActions}>
            <AppPressable
              style={[styles.editBtn, editMode && styles.editBtnActive]}
              onPress={() => setEditMode((v) => !v)}
            >
              <Ionicons
                name={editMode ? "checkmark" : "pencil-outline"}
                size={15}
                color={editMode ? colors.cream50 : colors.ink700}
              />
              <Text style={[styles.editText, editMode && styles.editTextActive]}>
                {editMode ? "Done" : "Edit"}
              </Text>
            </AppPressable>
            <AppPressable style={styles.headerBtn} onPress={() => navigation.navigate("AddDeviceModal")}>
              <Ionicons name="add" size={20} color={colors.ink700} />
            </AppPressable>
          </View>
        }
      />

      <View style={styles.body}>
        {/* search */}
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={17} color={colors.ink500} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search devices…"
            placeholderTextColor={colors.ink400}
            style={styles.searchInput}
          />
          {query.length > 0 && (
            <AppPressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={8}
              style={styles.searchClear}
              onPress={() => setQuery("")}
            >
              <Ionicons name="close-outline" size={18} color={colors.ink500} />
            </AppPressable>
          )}
        </View>

        {/* filter pills */}
        <FlatList
          horizontal
          data={FILTERS}
          keyExtractor={(i) => i.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.pillRow}
          renderItem={({ item }) => (
            <FilterPill
              label={item.label}
              isActive={item.key === activeFilter}
              onPress={() => setActiveFilter(item.key)}
              count={counts[item.key]}
            />
          )}
        />

        {/* grid */}
        {isDataLoading ? (
          <View style={styles.skeletonGrid}>
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonBlock key={i} style={styles.skeletonCard} />
            ))}
          </View>
        ) : (
          <FlatList
            data={filteredDevices}
            keyExtractor={(d) => d.id}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            columnWrapperStyle={styles.colWrap}
            contentContainerStyle={styles.gridContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={26} color={colors.ink500} />
                </View>
                <Text style={styles.emptyTitle}>Nothing matches</Text>
                <Text style={styles.emptyText}>
                  {query ? `No devices matching "${query}".` : `No ${activeFilter.toLowerCase()} devices.`}
                </Text>
              </View>
            }
            renderItem={({ item }) => (
              <View style={styles.cardWrap}>
                <DeviceCard
                  device={item}
                  roomName={roomMap.get(item.room_id) ?? "Unknown"}
                  editMode={editMode}
                  onEdit={() => navigation.navigate("EditDeviceModal", { deviceId: item.id })}
                  onToggle={
                    item.type === "CAMERA" || item.type === "MOTION" || item.type === "TEMP"
                      ? undefined
                      : () => void toggleDevice(item.id)
                  }
                />
              </View>
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    gap: spacing.md,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  editBtnActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  editText: {
    fontSize: 13,
    fontWeight: "500",
    color: colors.ink700,
  },
  editTextActive: {
    color: colors.cream50,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 44,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 14,
  },
  searchInput: {
    flex: 1,
    height: "100%",
    color: colors.ink900,
    fontSize: 15,
  },
  searchClear: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  pillRow: {
    gap: 8,
    paddingBottom: 4,
  },
  gridContent: {
    gap: spacing.md,
    paddingBottom: 120,
  },
  colWrap: {
    gap: spacing.md,
  },
  cardWrap: {
    flex: 1,
  },
  skeletonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  skeletonCard: {
    width: "48%",
    height: 152,
    borderRadius: 16,
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
    maxWidth: 240,
    lineHeight: 19,
  },
});
