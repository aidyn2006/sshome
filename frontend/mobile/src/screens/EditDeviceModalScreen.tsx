import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { getDeviceIconName, getStatusLabel, isDeviceActive } from "../utils/device";

type Props = NativeStackScreenProps<RootStackParamList, "EditDeviceModal">;

function typeLabel(type: string): string {
  switch (type) {
    case "LIGHT":
      return "Light";
    case "DOOR":
      return "Door";
    case "AC":
      return "Climate";
    case "TEMP":
      return "Sensor";
    case "CAMERA":
      return "Camera";
    case "MOTION":
      return "Motion";
    default:
      return type;
  }
}

export function EditDeviceModalScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { devices, rooms, editDevice, removeDevice } = useSmartHome();
  const device = devices.find((item) => item.id === route.params.deviceId);
  const [name, setName] = useState(device?.name ?? "");
  const [selectedRoomId, setSelectedRoomId] = useState(device?.room_id ?? rooms[0]?.id ?? "");
  const [nameFocused, setNameFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const hasChanges = useMemo(() => {
    if (!device) {
      return false;
    }

    return name.trim() !== device.name || selectedRoomId !== device.room_id;
  }, [device, name, selectedRoomId]);

  const canSave = Boolean(device && name.trim() && selectedRoomId && hasChanges && !isSaving && !isDeleting);

  const save = async () => {
    if (!device || !canSave) {
      return;
    }

    setIsSaving(true);
    const updated = await editDevice(device.id, {
      name,
      roomId: selectedRoomId,
    });
    setIsSaving(false);

    if (updated) {
      navigation.goBack();
    }
  };

  const deleteDevice = async () => {
    if (!device || isDeleting) {
      return;
    }

    setIsDeleting(true);
    const deleted = await removeDevice(device.id);
    setIsDeleting(false);

    if (deleted) {
      navigation.goBack();
    }
  };

  const confirmDelete = () => {
    if (!device) {
      return;
    }

    const message = `Delete "${device.name}"? This removes it from your rooms and scenes.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        void deleteDevice();
      }
      return;
    }

    Alert.alert("Delete device", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void deleteDevice() },
    ]);
  };

  if (!device) {
    return (
      <View style={[styles.wrap, styles.centerWrap]}>
        <View style={[styles.missingSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
          <View style={styles.grabber} />
          <View style={styles.missingIcon}>
            <Ionicons name="hardware-chip-outline" size={24} color={colors.ink500} />
          </View>
          <Text style={styles.missingTitle}>Device not found</Text>
          <Pressable style={styles.doneBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const iconName = getDeviceIconName(device.type, device.status);
  const active = isDeviceActive(device.status);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <ScrollView
        style={styles.scrollWrap}
        contentContainerStyle={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.grabber} />

        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>DEVICE</Text>
            <Text style={styles.title}>Edit device</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>

        <View style={styles.summary}>
          <View style={[styles.summaryIcon, active && styles.summaryIconActive]}>
            <Ionicons
              name={iconName as keyof typeof Ionicons.glyphMap}
              size={22}
              color={active ? colors.accent : colors.ink600}
            />
          </View>
          <View style={styles.summaryText}>
            <Text style={styles.summaryTitle}>{typeLabel(device.type)}</Text>
            <Text style={styles.summaryMeta}>
              {getStatusLabel(device.status)}
              {device.hardware_id ? ` · ${device.hardware_id}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DEVICE NAME</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.ink500} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Device name"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
              autoFocus
            />
          </View>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ROOM</Text>
          {rooms.length === 0 ? (
            <View style={styles.noRooms}>
              <Text style={styles.noRoomsText}>No rooms available.</Text>
            </View>
          ) : (
            <View style={styles.roomList}>
              {rooms.map((room) => (
                <Pressable
                  key={room.id}
                  style={[styles.roomRow, selectedRoomId === room.id && styles.roomRowActive]}
                  onPress={() => setSelectedRoomId(room.id)}
                >
                  <Text style={styles.roomEmoji}>{room.emoji}</Text>
                  <Text style={[styles.roomName, selectedRoomId === room.id && styles.roomNameActive]}>
                    {room.name}
                  </Text>
                  {selectedRoomId === room.id && (
                    <Ionicons name="checkmark" size={18} color={colors.accent} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
        </View>

        <View style={styles.actions}>
          <Pressable
            style={[styles.deleteBtn, isDeleting && styles.actionDisabled]}
            onPress={confirmDelete}
            disabled={isDeleting || isSaving}
          >
            <Ionicons name="trash-outline" size={16} color={colors.danger} />
            <Text style={styles.deleteText}>{isDeleting ? "Deleting..." : "Delete"}</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, !canSave && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={!canSave}
          >
            <Text style={styles.saveText}>{isSaving ? "Saving..." : "Save"}</Text>
            {!isSaving && <Ionicons name="checkmark" size={16} color={colors.onAccent} />}
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(11,13,18,0.4)",
  },
  centerWrap: {
    justifyContent: "flex-end",
  },
  scrollWrap: {
    backgroundColor: colors.cream50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "92%",
  },
  sheet: {
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 20,
  },
  missingSheet: {
    backgroundColor: colors.cream50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 14,
    alignItems: "center",
  },
  grabber: {
    width: 36,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.hairlineStrong,
    alignSelf: "center",
    marginBottom: 4,
  },
  header: {
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
    fontSize: 24,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.5,
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
  summary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    padding: 14,
  },
  summaryIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
  },
  summaryIconActive: {
    backgroundColor: colors.accentTint,
  },
  summaryText: {
    flex: 1,
  },
  summaryTitle: {
    color: colors.ink900,
    fontSize: 15,
    fontWeight: "600",
  },
  summaryMeta: {
    color: colors.ink500,
    fontSize: 12.5,
    marginTop: 2,
  },
  fieldGroup: {
    gap: 8,
  },
  fieldLabel: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 52,
    paddingHorizontal: 16,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 14,
  },
  inputWrapFocused: {
    borderColor: colors.ink900,
    borderWidth: 1,
  },
  input: {
    flex: 1,
    height: "100%",
    color: colors.ink900,
    fontSize: 16,
  },
  roomList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  roomRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  roomRowActive: {
    backgroundColor: colors.accentTint,
  },
  roomEmoji: {
    fontSize: 20,
  },
  roomName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink700,
  },
  roomNameActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  noRooms: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  noRoomsText: {
    color: colors.ink500,
    fontSize: 13.5,
    lineHeight: 19,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  deleteBtn: {
    flex: 1,
    flexDirection: "row",
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.dangerSoft,
    borderWidth: 0.5,
    borderColor: "rgba(199, 37, 62, 0.18)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  deleteText: {
    color: colors.danger,
    fontSize: 15,
    fontWeight: "500",
  },
  saveBtn: {
    flex: 2,
    flexDirection: "row",
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  actionDisabled: {
    opacity: 0.45,
  },
  saveText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "500",
  },
  missingIcon: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
  },
  missingTitle: {
    color: colors.ink900,
    fontSize: 18,
    fontWeight: "700",
  },
  doneBtn: {
    height: 46,
    alignSelf: "stretch",
    borderRadius: 999,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  doneText: {
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "500",
  },
});
