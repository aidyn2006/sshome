import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
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
import type { DeviceType } from "../types/smartHome";

type Props = NativeStackScreenProps<RootStackParamList, "AddDeviceModal">;

type DeviceTypeOption = {
  type: DeviceType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const DEVICE_TYPES: DeviceTypeOption[] = [
  { type: "LIGHT",  label: "Light",   icon: "bulb-outline" },
  { type: "DOOR",   label: "Door",    icon: "lock-closed-outline" },
  { type: "AC",     label: "Climate", icon: "snow-outline" },
  { type: "TEMP",   label: "Sensor",  icon: "thermometer-outline" },
  { type: "CAMERA", label: "Camera",  icon: "videocam-outline" },
  { type: "MOTION", label: "Motion",  icon: "walk-outline" },
];

export function AddDeviceModalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { rooms, addDevice } = useSmartHome();

  const [name, setName] = useState("");
  const [hardwareId, setHardwareId] = useState("");
  const [selectedType, setSelectedType] = useState<DeviceType>("LIGHT");
  const [selectedRoomId, setSelectedRoomId] = useState<string>(rooms[0]?.id ?? "");
  const [nameFocused, setNameFocused] = useState(false);
  const [hardwareFocused, setHardwareFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSave = name.trim().length > 0 && hardwareId.trim().length > 0 && selectedRoomId.length > 0;

  const save = async () => {
    if (!canSave) return;
    setSaveError(null);
    setIsSaving(true);
    try {
      const added = await addDevice(name, selectedType, selectedRoomId, hardwareId);
      if (added) {
        navigation.goBack();
      }
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Unable to add device");
    } finally {
      setIsSaving(false);
    }
  };

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
            <Text style={styles.title}>New device</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>

        {/* Device type picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>TYPE</Text>
          <View style={styles.typeRow}>
            {DEVICE_TYPES.map((opt) => (
              <Pressable
                key={opt.type}
                style={[styles.typeChip, selectedType === opt.type && styles.typeChipActive]}
                onPress={() => setSelectedType(opt.type)}
              >
                <Ionicons
                  name={opt.icon}
                  size={20}
                  color={selectedType === opt.type ? colors.surface : colors.ink700}
                />
                <Text style={[styles.typeChipLabel, selectedType === opt.type && styles.typeChipLabelActive]}>
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Firmware ID */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>FIRMWARE ID</Text>
          <View style={[styles.inputWrap, hardwareFocused && styles.inputWrapFocused]}>
            <Ionicons name="barcode-outline" size={18} color={colors.ink500} />
            <TextInput
              value={hardwareId}
              onChangeText={setHardwareId}
              placeholder="sshome_20260513_a3f2"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setHardwareFocused(true)}
              onBlur={() => setHardwareFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Device name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DEVICE NAME</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <Ionicons name="hardware-chip-outline" size={18} color={colors.ink500} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Bedroom Lamp"
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

        {/* Room picker */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>ROOM</Text>
          {rooms.length === 0 ? (
            <View style={styles.noRooms}>
              <Text style={styles.noRoomsText}>No rooms yet - add a room first via the profile icon.</Text>
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

        {saveError && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.red} />
            <Text style={styles.errorText}>{saveError}</Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={!canSave || isSaving}
          >
            <Text style={styles.saveText}>{isSaving ? "Adding..." : "Add Device"}</Text>
            {!isSaving && <Ionicons name="add" size={18} color="#fff" />}
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
  typeRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  typeChipActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  typeChipLabel: {
    fontSize: 13.5,
    fontWeight: "500",
    color: colors.ink700,
  },
  typeChipLabelActive: {
    color: colors.surface,
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
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    color: colors.ink700,
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
  saveText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "500",
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fff1f1",
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: "#f5c6c6",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    color: "#c53030",
    fontSize: 13.5,
    lineHeight: 18,
  },
});
