import { Ionicons } from "@expo/vector-icons";
import { useMemo } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { getDeviceIconName, isDeviceActive } from "../utils/device";

type Props = NativeStackScreenProps<RootStackParamList, "ManageFavoritesModal">;

export function ManageFavoritesModalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { devices, rooms, favoriteDeviceIds, toggleFavorite } = useSmartHome();

  const roomMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const sortedDevices = useMemo(
    () =>
      [...devices].sort((a, b) => {
        const aFav = favoriteDeviceIds.includes(a.id) ? 0 : 1;
        const bFav = favoriteDeviceIds.includes(b.id) ? 0 : 1;
        return aFav - bFav || a.name.localeCompare(b.name);
      }),
    [devices, favoriteDeviceIds]
  );

  return (
    <View style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, 24) }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 16 }]}>
        <View style={styles.grabber} />
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.eyebrow}>QUICK CONTROL</Text>
            <Text style={styles.title}>Edit Favorites</Text>
            <Text style={styles.subtitle}>
              {favoriteDeviceIds.length} device{favoriteDeviceIds.length !== 1 ? "s" : ""} selected
            </Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
      >
        {sortedDevices.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No devices available yet.</Text>
          </View>
        ) : (
          <View style={styles.listCard}>
            {sortedDevices.map((device, index) => {
              const isFav = favoriteDeviceIds.includes(device.id);
              const active = isDeviceActive(device.status);
              const iconName = getDeviceIconName(device.type, device.status);
              const roomName = roomMap.get(device.room_id) ?? "Unknown";

              return (
                <View key={device.id}>
                  <Pressable
                    style={styles.deviceRow}
                    onPress={() => toggleFavorite(device.id)}
                  >
                    <View style={[styles.iconBox, active && styles.iconBoxActive]}>
                      <Ionicons
                        name={iconName as keyof typeof Ionicons.glyphMap}
                        size={18}
                        color={active ? colors.accent : colors.ink500}
                      />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                      <Text style={styles.deviceRoom}>{roomName}</Text>
                    </View>
                    <View style={[styles.checkbox, isFav && styles.checkboxActive]}>
                      {isFav && <Ionicons name="checkmark" size={14} color={colors.surface} />}
                    </View>
                  </Pressable>
                  {index < sortedDevices.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </View>
              );
            })}
          </View>
        )}

        <Text style={styles.hint}>
          Selected devices appear in Quick Control on the home screen.
        </Text>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 20) }]}>
        <Pressable style={styles.doneBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.doneBtnText}>Done</Text>
        </Pressable>
      </View>
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
  listContent: {
    padding: 20,
    gap: 12,
    paddingBottom: 100,
  },
  listCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  iconBoxActive: {
    backgroundColor: colors.accentTint,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 14.5,
    fontWeight: "500",
    color: colors.ink900,
  },
  deviceRoom: {
    fontSize: 12,
    color: colors.ink500,
    marginTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.ink300,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  checkboxActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.hairline,
    marginLeft: 64,
  },
  empty: {
    paddingVertical: 32,
    alignItems: "center",
  },
  emptyText: {
    color: colors.ink500,
    fontSize: 14,
  },
  hint: {
    fontSize: 12.5,
    color: colors.ink400,
    textAlign: "center",
    lineHeight: 18,
    paddingHorizontal: 16,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: colors.hairline,
    backgroundColor: colors.cream50,
  },
  doneBtn: {
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
  },
});
