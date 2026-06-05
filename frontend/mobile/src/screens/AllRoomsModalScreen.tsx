import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
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
  const { rooms, devices, renameRoom, removeRoom } = useSmartHome();
  const [editMode, setEditMode] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, string>>({});

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

  const saveName = (roomId: string, currentName: string) => {
    const draft = drafts[roomId];
    if (draft === undefined || draft.trim() === currentName) {
      return;
    }
    void renameRoom(roomId, draft);
  };

  const confirmDelete = (roomId: string, name: string) => {
    const message = `Delete "${name}"? All devices in the room will be deleted.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        void removeRoom(roomId);
      }
      return;
    }

    Alert.alert("Delete room", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeRoom(roomId) },
    ]);
  };

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
          <View style={styles.headerActions}>
            {roomInfo.length > 0 && (
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
            )}
            <AppPressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
              <Ionicons name="close" size={18} color={colors.ink700} />
            </AppPressable>
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.grid}
        keyboardShouldPersistTaps="handled"
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
        ) : editMode ? (
          <View style={styles.editList}>
            {roomInfo.map((room) => (
              <View key={room.id} style={styles.editRow}>
                <Text style={styles.editEmoji}>{room.emoji}</Text>
                <TextInput
                  value={drafts[room.id] ?? room.name}
                  onChangeText={(text) => setDrafts((prev) => ({ ...prev, [room.id]: text }))}
                  onBlur={() => saveName(room.id, room.name)}
                  onSubmitEditing={() => saveName(room.id, room.name)}
                  style={styles.editInput}
                  returnKeyType="done"
                  placeholderTextColor={colors.ink400}
                />
                <AppPressable
                  style={styles.deleteBtn}
                  onPress={() => confirmDelete(room.id, room.name)}
                >
                  <Ionicons name="trash-outline" size={16} color={colors.danger} />
                </AppPressable>
              </View>
            ))}
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
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 36,
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
  editList: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  editRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  editEmoji: {
    fontSize: 20,
  },
  editInput: {
    flex: 1,
    height: 44,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink900,
  },
  deleteBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: "#fff1f1",
    borderWidth: 0.5,
    borderColor: "#f5c6c6",
    alignItems: "center",
    justifyContent: "center",
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
