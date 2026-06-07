import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import { AppPressable } from "../components/AppPressable";
import { DeviceToggleRow } from "../components/DeviceToggleRow";
import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { isDeviceActive } from "../utils/device";

type Props = NativeStackScreenProps<RootStackParamList, "RoomDetailModal">;

// Sensors and cameras are status-only — the same rule the Home and Devices
// screens use when deciding whether a row gets a toggle.
const READ_ONLY_TYPES = new Set(["CAMERA", "MOTION", "TEMP"]);

export function RoomDetailModalScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { roomId } = route.params;
  const { rooms, devices, toggleDevice } = useSmartHome();

  const room = useMemo(() => rooms.find((r) => r.id === roomId), [rooms, roomId]);
  const roomDevices = useMemo(
    () => devices.filter((d) => d.room_id === roomId),
    [devices, roomId]
  );
  const activeCount = useMemo(
    () => roomDevices.filter((d) => isDeviceActive(d.status)).length,
    [roomDevices]
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View style={styles.headerLeft}>
            <View style={styles.emojiBox}>
              <Text style={styles.emoji}>{room?.emoji ?? "🏠"}</Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>ROOM</Text>
              <Text style={styles.title}>{room?.name ?? "Room"}</Text>
              <Text style={styles.subtitle}>
                {roomDevices.length === 0
                  ? "No devices yet"
                  : `${activeCount} of ${roomDevices.length} device${roomDevices.length === 1 ? "" : "s"} active`}
              </Text>
            </View>
          </View>
          <View style={styles.headerActions}>
            <AppPressable
              style={styles.addBtn}
              onPress={() => navigation.navigate("AddDeviceModal", { roomId })}
              accessibilityLabel="Add a device to this room"
            >
              <Ionicons name="add" size={20} color={colors.ink700} />
            </AppPressable>
            <AppPressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={18} color={colors.ink700} />
            </AppPressable>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.body}>
        {roomDevices.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="hardware-chip-outline" size={28} color={colors.ink400} />
            </View>
            <Text style={styles.emptyTitle}>No devices here</Text>
            <Text style={styles.emptyText}>
              Add a device and assign it to this room to control it from here.
            </Text>
            <AppPressable
              style={styles.emptyAddBtn}
              onPress={() => navigation.navigate("AddDeviceModal", { roomId })}
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.emptyAddText}>Add device</Text>
            </AppPressable>
          </View>
        ) : (
          <View style={styles.card}>
            {roomDevices.map((device, index) => (
              <View key={device.id}>
                <DeviceToggleRow
                  device={device}
                  roomName={room?.name ?? "Room"}
                  onToggle={
                    READ_ONLY_TYPES.has(device.type) ? undefined : () => void toggleDevice(device.id)
                  }
                />
                {index < roomDevices.length - 1 && <View style={styles.divider} />}
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
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
  },
  emojiBox: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  emoji: {
    fontSize: 26,
  },
  headerText: {
    flex: 1,
    minWidth: 0,
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
    fontSize: 26,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.ink500,
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
    flexShrink: 0,
  },
  addBtn: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
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
  },
  body: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.hairline,
    marginLeft: 60,
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
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 46,
    paddingHorizontal: 20,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    marginTop: 8,
  },
  emptyAddText: {
    color: "#fff",
    fontSize: 14.5,
    fontWeight: "600",
  },
});
