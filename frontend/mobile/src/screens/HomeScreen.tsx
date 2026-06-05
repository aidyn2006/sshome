import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from "react-native";
import { AppPressable } from "../components/AppPressable";

import { getBackendHealth } from "../api/system";
import { DeviceToggleRow } from "../components/DeviceToggleRow";
import { SensorRoomsSheet } from "../components/SensorRoomsSheet";
import { RoomCard } from "../components/RoomCard";
import { ScreenHeader } from "../components/ScreenHeader";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatCard } from "../components/StatCard";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { isDeviceActive } from "../utils/device";

const STATIC_STAT_CONFIG = [
  { id: "temperature", icon: "thermometer-outline" as const, title: "Temperature", accent: "#C8674A" },
  { id: "humidity",    icon: "water-outline" as const,       title: "Humidity",    accent: "#2A6FDB" },
  { id: "energy",      icon: "flash-outline" as const,       title: "Energy",      accent: "#B45309" },
  { id: "air",         icon: "leaf-outline" as const,        title: "Air Quality", accent: "#1F8A5B" },
    { id: "active",      icon: "flash-outline" as const,          title: "Active",      accent: "#B45309" },
    { id: "battery",     icon: "battery-half-outline" as const,   title: "Battery",     accent: "#1F8A5B" },

];

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5)  return "Good night";
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { homes, rooms, devices, isDataLoading, toggleDevice, user } = useSmartHome();
  const [backendStatus, setBackendStatus] = useState<"connected" | "checking" | "unavailable">("checking");
  const [sensorSheetOpen, setSensorSheetOpen] = useState(false);

  const activeDevicesCount = useMemo(
    () => devices.filter((d) => isDeviceActive(d.status)).length,
    [devices]
  );

  const roomInfo = useMemo(
    () =>
      rooms.map((room) => {
        const roomDevices = devices.filter((d) => d.room_id === room.id);
        const activeCount = roomDevices.filter((d) => isDeviceActive(d.status)).length;
        return { ...room, deviceCount: roomDevices.length, activeCount, isActive: activeCount > 0 };
      }),
    [devices, rooms]
  );

  const roomNameMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const statConfig = useMemo(() => {
    const sensors = devices.filter((d) => d.type === "TEMP" && d.telemetry);
    const temps = sensors.map((d) => d.telemetry?.temp).filter((v): v is number => v != null);
    const humids = sensors.map((d) => d.telemetry?.humidity).filter((v): v is number => v != null);
    const avg = (arr: number[]) => Math.round((arr.reduce((s, v) => s + v, 0) / arr.length) * 10) / 10;
    const sensorLabel = sensors.length === 0 ? "No sensor" : sensors.length === 1 ? sensors[0].name : `${sensors.length} sensors`;
    const hasSensors = sensors.length > 0;
    const batteries = devices
      .map((d) => d.battery_level)
      .filter((level): level is number => level != null);
    const lowestBattery = batteries.length > 0 ? Math.min(...batteries) : null;

    return [
      {
        ...STATIC_STAT_CONFIG[0],
        value: temps.length > 0 ? `${avg(temps)} °C` : "— °C",
        subtitle: sensorLabel,
        tappable: hasSensors,
      },
      {
        ...STATIC_STAT_CONFIG[1],
        value: humids.length > 0 ? `${avg(humids)} %` : "— %",
        subtitle: sensorLabel,
        tappable: hasSensors,
      },
      { ...STATIC_STAT_CONFIG[2], value: "1.84", subtitle: "kWh · 1h", tappable: false },
      { ...STATIC_STAT_CONFIG[3], value: "42 AQI", subtitle: "Air quality", tappable: false },
      {
        ...STATIC_STAT_CONFIG[4],
        value: `${activeDevicesCount}/${devices.length}`,
        subtitle: "Devices on",
        tappable: false,
      },
      {
        ...STATIC_STAT_CONFIG[5],
        value: lowestBattery != null ? `${lowestBattery} %` : "—",
        subtitle: lowestBattery != null ? "Lowest battery" : "No hardware",
        tappable: false,
      },
    ];
  }, [activeDevicesCount, devices]);

  const doors = useMemo(() => devices.filter((d) => d.type === "DOOR"), [devices]);
  const openDoors = useMemo(() => doors.filter((d) => d.status === "OPEN"), [doors]);
  const allDoorsLocked = doors.length > 0 && openDoors.length === 0;
  const { favoriteDeviceIds } = useSmartHome();
  const favoriteDevices = useMemo(
    () =>
      favoriteDeviceIds.length > 0
        ? devices.filter((d) => favoriteDeviceIds.includes(d.id))
        : devices.slice(0, 4),
    [devices, favoriteDeviceIds]
  );

  useEffect(() => {
    const controller = new AbortController();
    getBackendHealth(controller.signal)
      .then((r) => setBackendStatus(r.status === "ok" ? "connected" : "unavailable"))
      .catch(() => setBackendStatus("unavailable"));
    return () => controller.abort();
  }, []);

  const firstName = user?.name?.split(" ")[0] || "there";

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.content}
    >
      <ScreenHeader
        eyebrow={(homes[0]?.name ?? "My Home").toUpperCase()}
        title={<Text style={styles.greetTitle}>{greeting()}, <Text style={styles.greetAccent}>{firstName}.</Text></Text>}
        subtitle={`${activeDevicesCount} of ${devices.length} devices active · ${rooms.length} rooms`}
        secure
        backendStatus={backendStatus}
        right={
          <AppPressable onPress={() => navigation.navigate("AddLocationModal")} style={styles.avatarBtn}>
            <Ionicons name="person-outline" size={18} color={colors.ink700} />
          </AppPressable>
        }
      />

      <View style={styles.body}>
        {/* Overview grid */}
        <Section eyebrow="OVERVIEW" title="Right now">
          <View style={styles.grid2}>
            {isDataLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} style={styles.statSkeleton} />
                ))
              : statConfig.map((s) => (
                  <StatCard
                    key={s.id}
                    icon={s.icon}
                    title={s.title}
                    value={s.value}
                    subtitle={s.subtitle}
                    accent={s.accent}
                    onPress={s.tappable ? () => setSensorSheetOpen(true) : undefined}
                  />
                ))}
          </View>
        </Section>

        {/* Rooms grid */}
        <Section eyebrow="MY ROOMS" title="Rooms" action="See all" onAction={() => navigation.navigate("AllRoomsModal")}>
          <View style={styles.grid2}>
            {isDataLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} style={styles.roomSkeleton} />
                ))
              : roomInfo.length === 0
                ? (
                  <View style={styles.emptyCard}>
                    <Text style={styles.emptyTitle}>No rooms yet</Text>
                    <Text style={styles.emptyText}>Open the profile icon to add a home or room.</Text>
                  </View>
                )
                : roomInfo.slice(0, 4).map((r) => (
                    <View key={r.id} style={styles.roomCardWrap}>
                      <RoomCard
                        emoji={r.emoji}
                        name={r.name}
                        deviceCount={r.deviceCount}
                        isActive={r.isActive}
                        activeCount={r.activeCount}
                      />
                    </View>
                  ))}
          </View>
        </Section>

        {/* Quick control */}
        <Section eyebrow="QUICK CONTROL" title="Favorites" action="Edit" onAction={() => navigation.navigate("ManageFavoritesModal")}>
          <View style={styles.quickCard}>
            {isDataLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonBlock key={i} style={styles.rowSkeleton} />
                ))
              : favoriteDevices.length === 0
                ? (
                  <View style={styles.emptyInline}>
                    <Text style={styles.emptyText}>Devices will appear here once connected.</Text>
                  </View>
                )
                : favoriteDevices.map((d, i) => (
                    <View key={d.id}>
                      <DeviceToggleRow
                        device={d}
                        roomName={roomNameMap.get(d.room_id) ?? "Unknown"}
                        onToggle={
                          d.type === "CAMERA" || d.type === "MOTION" || d.type === "TEMP"
                            ? undefined
                            : () => void toggleDevice(d.id)
                        }
                      />
                      {i < favoriteDevices.length - 1 && <View style={styles.divider} />}
                    </View>
                  ))}
          </View>
        </Section>

        {/* Security strip — computed from real DOOR devices */}
        {doors.length > 0 && (
          <View style={styles.securityStrip}>
            <View style={[styles.secIconBox, !allDoorsLocked && styles.secIconBoxWarn]}>
              <Ionicons
                name={allDoorsLocked ? "shield-checkmark" : "alert-circle-outline"}
                size={22}
                color={allDoorsLocked ? colors.success : colors.warn}
              />
            </View>
            <View style={styles.secContent}>
              <Text style={styles.secTitle}>
                {allDoorsLocked
                  ? "All doors locked"
                  : `${openDoors.length} ${openDoors.length === 1 ? "door" : "doors"} open`}
              </Text>
              <Text style={styles.secMeta}>
                {doors.length} {doors.length === 1 ? "DOOR" : "DOORS"} · {doors.length - openDoors.length} LOCKED
              </Text>
            </View>
          </View>
        )}

        {/* Loading hint */}
        {isDataLoading && (
          <View style={styles.loadingHint}>
            <ActivityIndicator size="small" color={colors.ink400} />
            <Text style={styles.loadingText}>Loading your home…</Text>
          </View>
        )}
      </View>

      <SensorRoomsSheet
        visible={sensorSheetOpen}
        onClose={() => setSensorSheetOpen(false)}
        rooms={rooms}
        devices={devices}
      />
    </ScrollView>
  );
}

function Section({
  eyebrow, title, action, onAction, children,
}: { eyebrow: string; title: string; action?: string; onAction?: () => void; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
          <Text style={styles.sectionTitle}>{title}</Text>
        </View>
        {action && (
          <AppPressable style={styles.sectionAction} onPress={onAction} disabled={!onAction}>
            <Text style={styles.sectionActionText}>{action}</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.ink700} />
          </AppPressable>
        )}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  content: {
    paddingBottom: 120,
  },
  body: {
    paddingHorizontal: 20,
    gap: 26,
  },
  greetTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  greetAccent: {
    color: colors.accent,
  },
  avatarBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  sectionEyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.4,
    marginTop: 3,
  },
  sectionAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  sectionActionText: {
    fontSize: 13,
    color: colors.ink700,
  },
  grid2: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statSkeleton: {
    width: "48%",
    height: 96,
    borderRadius: 14,
    flexGrow: 1,
  },
  roomCardWrap: {
    width: "48%",
    flexGrow: 1,
  },
  roomSkeleton: {
    width: "48%",
    height: 124,
    borderRadius: 16,
    flexGrow: 1,
  },
  rowSkeleton: {
    width: "100%",
    height: 68,
    borderRadius: 12,
  },
  quickCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.hairline,
    marginLeft: 60,
  },
  emptyCard: {
    flex: 1,
    padding: spacing.lg,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    gap: 4,
  },
  emptyInline: {
    padding: spacing.lg,
  },
  emptyTitle: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: "600",
  },
  emptyText: {
    color: colors.ink500,
    fontSize: 13,
    lineHeight: 18,
  },
  securityStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  secIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: colors.successSoft,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  secIconBoxWarn: {
    backgroundColor: "#fdf3e7",
  },
  secContent: {
    flex: 1,
  },
  secTitle: {
    color: colors.ink900,
    fontSize: 14.5,
    fontWeight: "500",
  },
  secMeta: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink500,
    marginTop: 2,
    letterSpacing: 0.3,
  },
  loadingHint: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  loadingText: {
    color: colors.ink500,
    fontSize: 13,
  },
});
