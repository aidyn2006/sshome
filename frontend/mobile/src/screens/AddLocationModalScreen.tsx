import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
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

type Props = NativeStackScreenProps<RootStackParamList, "AddLocationModal">;

type Mode = "home" | "room";

const ROOM_ICONS: Array<{ name: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { name: "Living Room", icon: "tv-outline" },
  { name: "Bedroom",     icon: "bed-outline" },
  { name: "Kitchen",     icon: "restaurant-outline" },
  { name: "Office",      icon: "desktop-outline" },
  { name: "Bathroom",    icon: "water-outline" },
  { name: "Garage",      icon: "car-outline" },
];

export function AddLocationModalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { homes, addHome, addRoom, isAuthSubmitting, logout } = useSmartHome();
  const [mode, setMode] = useState<Mode>("room");
  const [name, setName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>("tv-outline");
  const [nameFocused, setNameFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    if (mode === "home") {
      await addHome(name);
    } else {
      await addRoom(name, homes[0]?.id);
    }
    setIsSaving(false);
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
        {/* Grabber */}
        <View style={styles.grabber} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>LOCATION</Text>
            <Text style={styles.title}>New {mode === "home" ? "home" : "room"}</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>

        {/* Mode toggle */}
        <View style={styles.modeRow}>
          <ModeChip label="Home" icon="home-outline" active={mode === "home"} onPress={() => setMode("home")} />
          <ModeChip label="Room" icon="grid-outline" active={mode === "room"} onPress={() => setMode("room")} />
        </View>

        {/* Icon picker */}
        {mode === "room" && (
          <View style={styles.iconPicker}>
            <Text style={styles.fieldLabel}>ICON</Text>
            <View style={styles.iconRow}>
            {ROOM_ICONS.map((r) => (
              <Pressable
                key={r.name}
                style={[styles.iconOption, selectedIcon === r.icon && styles.iconOptionActive]}
                onPress={() => {
                  setSelectedIcon(r.icon);
                  if (!name.trim()) setName(r.name);
                }}
              >
                <Ionicons
                  name={r.icon}
                  size={22}
                  color={selectedIcon === r.icon ? colors.cream50 : colors.ink700}
                />
              </Pressable>
            ))}
            </View>
          </View>
        )}

        {/* Name field */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>{mode === "home" ? "HOME NAME" : "ROOM NAME"}</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <Ionicons
              name={mode === "home" ? "home-outline" : "grid-outline"}
              size={18}
              color={colors.ink500}
            />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder={mode === "home" ? "Mountain House" : "Office"}
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              returnKeyType="done"
              onSubmitEditing={() => void save()}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, (!name.trim() || isSaving) && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={!name.trim() || isSaving}
          >
            <Text style={styles.saveText}>{isSaving ? "Saving…" : "Save"}</Text>
            {!isSaving && <Ionicons name="chevron-forward" size={16} color="#fff" />}
          </Pressable>
        </View>

        {/* Sign out */}
        <View style={styles.divider} />
        <Pressable
          style={styles.signOutBtn}
          onPress={() => void logout()}
          disabled={isAuthSubmitting}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>
            {isAuthSubmitting ? "Signing out…" : "Sign out of this device"}
          </Text>
        </Pressable>
        <Text style={styles.sessionMeta}>Session · mobile · refreshed just now</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

function ModeChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={[styles.modeChip, active && styles.modeChipActive]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? colors.ink900 : colors.ink700} />
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(11,13,18,0.4)",
  },
  sheet: {
    backgroundColor: colors.cream50,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 12,
    gap: 18,
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
  modeRow: {
    flexDirection: "row",
    gap: 4,
    padding: 4,
    backgroundColor: colors.ink100,
    borderRadius: 999,
  },
  modeChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    height: 36,
    paddingHorizontal: 16,
    borderRadius: 999,
    backgroundColor: "transparent",
  },
  modeChipActive: {
    backgroundColor: colors.surface,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  modeChipText: {
    fontSize: 14,
    fontWeight: "500",
    color: colors.ink700,
  },
  modeChipTextActive: {
    color: colors.ink900,
  },
  iconPicker: {
    gap: 8,
  },
  iconRow: {
    flexDirection: "row",
    gap: 8,
  },
  iconOption: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  iconOptionActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  fieldGroup: {
    gap: 6,
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
  actions: {
    flexDirection: "row",
    gap: 10,
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
  divider: {
    height: 0.5,
    backgroundColor: colors.hairline,
    marginHorizontal: -24,
  },
  signOutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 8,
    height: 24,
    backgroundColor: "transparent",
  },
  signOutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
  },
  sessionMeta: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink400,
    marginTop: -12,
  },
});
