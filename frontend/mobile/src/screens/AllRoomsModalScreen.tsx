import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { RoomCard } from "../components/RoomCard";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { isDeviceActive } from "../utils/device";

type Props = NativeStackScreenProps<RootStackParamList, "AllRoomsModal">;

export function AllRoomsModalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { rooms, devices } = useSmartHome();

  const roomInfo = useMemo(
    () =>
      rooms.map((room) => {
        const roomDevices = devices.filter((d) => d.room_id === room.id);
        const activeCount = roomDevices.filter((d) => isDeviceActive(d.status)).length;
        return { ...room, deviceCount: roomDevices.length, activeCount };
      }),
    [rooms, devices]
  );

  const totalActive = useMemo(
    () => roomInfo.reduce((sum, r) => sum + r.activeCount, 0),
    [roomInfo]
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>MY ROOMS</Text>
            <Text style={styles.title}>All Rooms</Text>
            <Text style={styles.subtitle}>
              {rooms.length} room{rooms.length !== 1 ? "s" : ""} · {totalActive} device{totalActive !== 1 ? "s" : ""} active
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
      >
        {roomInfo.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="home-outline" size={28} color={colors.ink400} />
            </View>
            <Text style={styles.emptyTitle}>No rooms yet</Text>
            <Text style={styles.emptyText}>
              Use the profile icon on the home screen to add your first room.
            </Text>
          </View>
        ) : (
          <View style={styles.gridInner}>
            {roomInfo.map((room) => (
              <View key={room.id} style={styles.cardWrap}>
                <RoomCard
                  emoji={room.emoji}
                  name={room.name}
                  deviceCount={room.deviceCount}
                  isActive={room.activeCount > 0}
                  activeCount={room.activeCount}
                />
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
    gap: 12,
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.hairlineStrong,
    alignSelf: "center",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  eyebrow: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.ink500,
    marginTop: 4,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  grid: {
    padding: 20,
    paddingBottom: 40,
  },
  gridInner: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cardWrap: {
    width: "48%",
    flexGrow: 1,
  },
  empty: {
    paddingTop: 60,
    alignItems: "center",
    gap: 12,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.3,
  },
  emptyText: {
    color: colors.ink500,
    fontSize: 13.5,
    textAlign: "center",
    maxWidth: 260,
    lineHeight: 20,
  },
});
