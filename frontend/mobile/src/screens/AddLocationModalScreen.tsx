import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList, TabParamList } from "../navigation/types";
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
  const { homes, rooms, isAdmin, addHome, renameHome, removeHome, addRoom, isAuthSubmitting, logout } = useSmartHome();

  // Screens that were moved out of the bottom bar — reachable from here.
  const menuItems = (
    [
      { key: "Scenes", label: "Scenes", icon: "flash-outline", show: true },
      { key: "Activity", label: "Activity", icon: "pulse-outline", show: true },
      { key: "Room3D", label: "Room 3D", icon: "cube-outline", show: Platform.OS === "web" },
      { key: "Admin", label: "Admin", icon: "shield-checkmark-outline", show: isAdmin },
      { key: "AttackSim", label: "Red Team", icon: "bug-outline", show: isAdmin },
    ] as Array<{ key: keyof TabParamList; label: string; icon: keyof typeof Ionicons.glyphMap; show: boolean }>
  ).filter((item) => item.show);

  const openTab = (screen: keyof TabParamList) => {
    navigation.navigate("Tabs", { screen });
  };
  const [mode, setMode] = useState<Mode>("room");
  const [name, setName] = useState("");
  const [selectedHomeId, setSelectedHomeId] = useState<string>(homes[0]?.id ?? "");
  const [selectedIcon, setSelectedIcon] = useState<keyof typeof Ionicons.glyphMap>("tv-outline");
  const [nameFocused, setNameFocused] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [homeDrafts, setHomeDrafts] = useState<Record<string, string>>({});

  const startAddRoomForHome = (homeId: string) => {
    setMode("room");
    setSelectedHomeId(homeId);
    setName("");
  };

  const saveHomeName = (homeId: string, currentName: string) => {
    const draft = homeDrafts[homeId];
    if (draft === undefined || draft.trim() === currentName) {
      return;
    }
    void renameHome(homeId, draft);
  };

  const confirmDeleteHome = (homeId: string, homeName: string) => {
    const message = `Delete "${homeName}"? All rooms and devices in this home will be deleted.`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) {
        void removeHome(homeId);
      }
      return;
    }

    Alert.alert("Delete home", message, [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => void removeHome(homeId) },
    ]);
  };

  const save = async () => {
    if (!name.trim()) return;
    setIsSaving(true);
    if (mode === "home") {
      await addHome(name);
    } else {
      await addRoom(name, selectedHomeId || homes[0]?.id);
    }
    setIsSaving(false);
    navigation.goBack();
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
        {/* Grabber */}
        <View style={styles.grabber} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>LOCATION</Text>
            <Text style={styles.title}>New {mode === "home" ? "home" : "room"}</Text>
          </View>
          <AppPressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </AppPressable>
        </View>

        {/* Menu — screens moved out of the bottom bar */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>MENU</Text>
          <View style={styles.menuList}>
            {menuItems.map((item, index) => (
              <AppPressable
                key={item.key}
                style={[styles.menuRow, index < menuItems.length - 1 && styles.menuRowBorder]}
                onPress={() => openTab(item.key)}
              >
                <View style={styles.menuIcon}>
                  <Ionicons name={item.icon} size={18} color={colors.ink700} />
                </View>
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.ink400} />
              </AppPressable>
            ))}
          </View>
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
              <AppPressable
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
              </AppPressable>
            ))}
            </View>
          </View>
        )}

        {/* Home picker — which home the new room belongs to */}
        {mode === "room" && homes.length > 1 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>ADD TO HOME</Text>
            <View style={styles.homePicker}>
              {homes.map((home) => {
                const active = (selectedHomeId || homes[0]?.id) === home.id;
                return (
                  <AppPressable
                    key={home.id}
                    style={[styles.homePickerRow, active && styles.homePickerRowActive]}
                    onPress={() => setSelectedHomeId(home.id)}
                  >
                    <Ionicons
                      name="home-outline"
                      size={18}
                      color={active ? colors.accent : colors.ink500}
                    />
                    <Text style={[styles.homePickerName, active && styles.homePickerNameActive]}>
                      {home.name}
                    </Text>
                    {active && <Ionicons name="checkmark" size={18} color={colors.accent} />}
                  </AppPressable>
                );
              })}
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
          <AppPressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </AppPressable>
          <AppPressable
            style={[styles.saveBtn, (!name.trim() || isSaving) && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={!name.trim() || isSaving}
          >
            <Text style={styles.saveText}>{isSaving ? "Saving…" : "Save"}</Text>
            {!isSaving && <Ionicons name="chevron-forward" size={16} color="#fff" />}
          </AppPressable>
        </View>

        {/* Manage existing homes */}
        {homes.length > 0 && (
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>YOUR HOMES</Text>
            <View style={styles.homeList}>
              {homes.map((home) => {
                const roomCount = rooms.filter((r) => r.home_id === home.id).length;
                return (
                  <View key={home.id} style={styles.homeRow}>
                    <Ionicons name="home-outline" size={18} color={colors.ink500} />
                    <View style={styles.homeMain}>
                      <TextInput
                        value={homeDrafts[home.id] ?? home.name}
                        onChangeText={(text) => setHomeDrafts((prev) => ({ ...prev, [home.id]: text }))}
                        onBlur={() => saveHomeName(home.id, home.name)}
                        onSubmitEditing={() => saveHomeName(home.id, home.name)}
                        style={styles.homeInput}
                        returnKeyType="done"
                        placeholderTextColor={colors.ink400}
                      />
                      <Text style={styles.homeMeta}>
                        {roomCount} room{roomCount === 1 ? "" : "s"}
                      </Text>
                    </View>
                    <AppPressable
                      style={styles.homeAddRoomBtn}
                      onPress={() => startAddRoomForHome(home.id)}
                      accessibilityLabel={`Add a room to ${home.name}`}
                    >
                      <Ionicons name="add" size={16} color={colors.accent} />
                      <Text style={styles.homeAddRoomText}>Room</Text>
                    </AppPressable>
                    <AppPressable
                      style={styles.homeDeleteBtn}
                      onPress={() => confirmDeleteHome(home.id, home.name)}
                    >
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </AppPressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Account */}
        <View style={styles.divider} />
        <AppPressable
          style={styles.accountRow}
          onPress={() => navigation.navigate("ChangePasswordModal")}
        >
          <Ionicons name="lock-closed-outline" size={16} color={colors.ink700} />
          <Text style={styles.accountRowText}>Change password</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.ink400} />
        </AppPressable>

        {/* Sign out */}
        <AppPressable
          style={styles.signOutBtn}
          onPress={() => void logout()}
          disabled={isAuthSubmitting}
        >
          <Ionicons name="log-out-outline" size={16} color={colors.danger} />
          <Text style={styles.signOutText}>
            {isAuthSubmitting ? "Signing out…" : "Sign out of this device"}
          </Text>
        </AppPressable>
        <Text style={styles.sessionMeta}>Session · mobile · refreshed just now</Text>
      </ScrollView>
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
    <AppPressable
      style={[styles.modeChip, active && styles.modeChipActive]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={16} color={active ? colors.ink900 : colors.ink700} />
      <Text style={[styles.modeChipText, active && styles.modeChipTextActive]}>{label}</Text>
    </AppPressable>
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
  menuList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
  },
  menuRowBorder: {
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  menuIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.ink100,
  },
  menuLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink900,
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
  homePicker: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  homePickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  homePickerRowActive: {
    backgroundColor: colors.accentTint,
  },
  homePickerName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink700,
  },
  homePickerNameActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  homeList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  homeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  homeMain: {
    flex: 1,
  },
  homeInput: {
    height: 40,
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink900,
  },
  homeMeta: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink400,
    marginTop: -4,
    marginLeft: 2,
  },
  homeAddRoomBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 32,
    paddingHorizontal: 10,
    borderRadius: 999,
    backgroundColor: colors.accentTint,
  },
  homeAddRoomText: {
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: "600",
  },
  homeDeleteBtn: {
    width: 34,
    height: 34,
    borderRadius: 999,
    backgroundColor: "#fff1f1",
    borderWidth: 0.5,
    borderColor: "#f5c6c6",
    alignItems: "center",
    justifyContent: "center",
  },
  accountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 28,
  },
  accountRowText: {
    flex: 1,
    color: colors.ink700,
    fontSize: 14,
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
