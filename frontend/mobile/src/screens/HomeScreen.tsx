import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { getBackendHealth } from "../api/system";
import { DeviceToggleRow } from "../components/DeviceToggleRow";
import { RoomCard } from "../components/RoomCard";
import { SkeletonBlock } from "../components/SkeletonBlock";
import { StatCard } from "../components/StatCard";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors, gradients } from "../theme/colors";
import { spacing } from "../theme/spacing";
import { typography } from "../theme/typography";
import { isDeviceActive } from "../utils/device";

const stats = [
  { id: "temperature", icon: "thermometer-outline" as const, title: "Temperature", value: "22 C", subtitle: "Living Room" },
  { id: "humidity", icon: "water-outline" as const, title: "Humidity", value: "45%", subtitle: "Bedroom" },
  { id: "energy", icon: "flash-outline" as const, title: "Energy", value: "1.2 kWh", subtitle: "Today" }
];

export function HomeScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { rooms, devices, isDataLoading, toggleDevice, user } = useSmartHome();
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  const activeRoomsCount = useMemo(() => {
    const activeRooms = new Set(
      devices.filter((device) => isDeviceActive(device.status)).map((device) => device.room_id)
    );

    return activeRooms.size;
  }, [devices]);

  const activeDevicesCount = useMemo(
    () => devices.filter((device) => isDeviceActive(device.status)).length,
    [devices]
  );

  const favoriteDevices = useMemo(() => devices.slice(0, 4), [devices]);

  const roomInfo = useMemo(
    () =>
      rooms.map((room) => {
        const roomDevices = devices.filter((device) => device.room_id === room.id);
        return {
          ...room,
          deviceCount: roomDevices.length,
          isActive: roomDevices.some((device) => isDeviceActive(device.status))
        };
      }),
    [devices, rooms]
  );

  const roomNameMap = useMemo(() => new Map(rooms.map((room) => [room.id, room.name])), [rooms]);

  useEffect(() => {
    const controller = new AbortController();

    getBackendHealth(controller.signal)
      .then((response) => {
        setBackendOnline(response.status === "ok");
      })
      .catch(() => {
        setBackendOnline(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.contentContainer}>
        <View style={styles.headerRow}>
          <View style={{ flex: 1 }}>
            <Text style={typography.h1}>Welcome, {user?.name?.split(" ")[0] || "there"}</Text>
            <Text style={styles.subText}>
              {activeRoomsCount} rooms active - {activeDevicesCount} devices on
            </Text>
            <View style={styles.backendStatusRow}>
              <View
                style={[
                  styles.backendStatusDot,
                  backendOnline === true && styles.backendStatusDotOnline,
                  backendOnline === false && styles.backendStatusDotOffline
                ]}
              />
              <Text style={styles.backendStatusText}>
                Backend: {backendOnline === null ? "checking..." : backendOnline ? "connected" : "unavailable"}
              </Text>
            </View>
          </View>

          <Pressable onPress={() => navigation.navigate("AddLocationModal")}>
            <LinearGradient colors={gradients.avatar} style={styles.avatarCircle}>
              <Text style={styles.avatarText}>
                {(user?.name || "SS")
                  .split(" ")
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((chunk) => chunk[0]?.toUpperCase())
                  .join("") || "SS"}
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalList}
          >
            {isDataLoading
              ? Array.from({ length: 3 }).map((_, index) => (
                  <SkeletonBlock key={`stat-skeleton-${index}`} style={{ width: 180, height: 120 }} />
                ))
              : stats.map((item) => (
                  <StatCard
                    key={item.id}
                    icon={item.icon}
                    title={item.title}
                    value={item.value}
                    subtitle={item.subtitle}
                  />
                ))}
          </ScrollView>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>My Rooms</Text>
          {isDataLoading ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {Array.from({ length: 4 }).map((_, index) => (
                <SkeletonBlock key={`room-skeleton-${index}`} style={{ width: 140, height: 160 }} />
              ))}
            </ScrollView>
          ) : roomInfo.length === 0 ? (
            <View style={styles.emptyBlock}>
              <Text style={styles.emptyTitle}>No rooms yet</Text>
              <Text style={styles.emptyText}>Open the avatar menu to create your first home or room.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalList}
            >
              {roomInfo.map((room) => (
                <RoomCard
                  key={room.id}
                  emoji={room.emoji}
                  name={room.name}
                  deviceCount={room.deviceCount}
                  isActive={room.isActive}
                />
              ))}
            </ScrollView>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Control</Text>
          <View style={styles.quickControlList}>
            {isDataLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <SkeletonBlock key={`quick-skeleton-${index}`} style={{ width: "100%", height: 72 }} />
                ))
              : favoriteDevices.map((device) => (
                  <DeviceToggleRow
                    key={device.id}
                    device={device}
                    roomName={roomNameMap.get(device.room_id) ?? "Unknown"}
                    onToggle={() => {
                      void toggleDevice(device.id);
                    }}
                  />
                ))}

            {!isDataLoading && favoriteDevices.length === 0 ? (
              <View style={styles.emptyInline}>
                <Text style={styles.emptyText}>Devices will show up here as soon as they exist on the backend.</Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.footerHint}>
          {isDataLoading ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Ionicons name="sparkles-outline" size={16} color={colors.textSecondary} />
          )}
          <Text style={styles.footerHintText}>Tap the avatar to add a home or room from the modal.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background
  },
  contentContainer: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxxl
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md
  },
  subText: {
    marginTop: spacing.xs,
    fontSize: 12,
    color: colors.textSecondary
  },
  backendStatusRow: {
    marginTop: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs
  },
  backendStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.inactiveGray
  },
  backendStatusDotOnline: {
    backgroundColor: colors.activeGreen
  },
  backendStatusDotOffline: {
    backgroundColor: colors.danger
  },
  backendStatusText: {
    fontSize: 12,
    color: colors.textSecondary
  },
  avatarCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center"
  },
  avatarText: {
    color: colors.textOnAccent,
    fontSize: 16,
    fontWeight: "700"
  },
  section: {
    gap: spacing.md
  },
  sectionTitle: {
    ...typography.h2
  },
  horizontalList: {
    gap: spacing.md,
    paddingRight: spacing.xs
  },
  quickControlList: {
    gap: spacing.sm
  },
  emptyBlock: {
    padding: spacing.lg,
    borderRadius: 18,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs
  },
  emptyInline: {
    paddingVertical: spacing.md
  },
  emptyTitle: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  emptyText: {
    color: colors.textSecondary,
    fontSize: 13
  },
  footerHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: -4
  },
  footerHintText: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
