import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { NativeStackScreenProps } from "@react-navigation/native-stack";

import type { RootStackParamList } from "../navigation/types";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import type { Device, DeviceAction } from "../types/smartHome";

type Props = NativeStackScreenProps<RootStackParamList, "AddScenarioModal">;

// Only types the backend can actuate from a scenario.
const CONTROLLABLE_TYPES: Array<Device["type"]> = ["LIGHT", "DOOR", "AC"];

type ActionChoice = {
  action: DeviceAction;
  label: string;
};

function choicesForDevice(device: Device): ActionChoice[] {
  if (device.type === "DOOR") {
    return [
      { action: "OPEN", label: "Open" },
      { action: "CLOSE", label: "Close" },
    ];
  }

  return [
    { action: "TURN_ON", label: "On" },
    { action: "TURN_OFF", label: "Off" },
  ];
}

const deviceIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  LIGHT: "bulb-outline",
  DOOR: "lock-closed-outline",
  AC: "snow-outline",
};

export function AddScenarioModalScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { devices, rooms, scenarios, addScenario, editScenario, generateScenarioDraft } = useSmartHome();

  const scenarioId = route.params?.scenarioId;
  const editing = scenarios.find((s) => s.id === scenarioId);

  const [name, setName] = useState(editing?.name ?? "");
  const [description, setDescription] = useState(editing?.description ?? "");
  const [selectedActions, setSelectedActions] = useState<Record<string, DeviceAction>>(() => {
    const initial: Record<string, DeviceAction> = {};
    editing?.actions.forEach((item) => {
      initial[item.device_id] = item.action;
    });
    return initial;
  });
  const [nameFocused, setNameFocused] = useState(false);
  const [descFocused, setDescFocused] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiPromptFocused, setAiPromptFocused] = useState(false);
  const [aiDraftMessage, setAiDraftMessage] = useState("");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const controllableDevices = useMemo(
    () => devices.filter((d) => CONTROLLABLE_TYPES.includes(d.type)),
    [devices]
  );
  const roomNameMap = useMemo(() => new Map(rooms.map((r) => [r.id, r.name])), [rooms]);

  const actionCount = Object.keys(selectedActions).length;
  const canSave = name.trim().length > 0 && actionCount > 0;
  const canGenerateDraft = aiPrompt.trim().length > 0 && controllableDevices.length > 0 && !isGeneratingDraft;

  const toggleAction = (deviceId: string, action: DeviceAction) => {
    setSelectedActions((prev) => {
      const next = { ...prev };
      if (next[deviceId] === action) {
        delete next[deviceId];
      } else {
        next[deviceId] = action;
      }
      return next;
    });
  };

  const showDraftError = (message: string) => {
    if (Platform.OS === "web") {
      window.alert(`AI draft failed\n\n${message}`);
      return;
    }

    Alert.alert("AI draft failed", message);
  };

  const generateDraft = async () => {
    const prompt = aiPrompt.trim();
    if (!prompt || isGeneratingDraft) return;

    setIsGeneratingDraft(true);
    setAiDraftMessage("");

    try {
      const draft = await generateScenarioDraft(prompt);
      const knownDeviceIds = new Set(controllableDevices.map((device) => device.id));
      const nextActions: Record<string, DeviceAction> = {};
      draft.actions.forEach((item) => {
        if (knownDeviceIds.has(item.device_id)) {
          nextActions[item.device_id] = item.action;
        }
      });

      setName(draft.name);
      setDescription(draft.description ?? "");
      setSelectedActions(nextActions);
      setAiDraftMessage(draft.explanation);
    } catch (error) {
      showDraftError(error instanceof Error ? error.message : "Unable to generate a scenario draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const save = async () => {
    if (!canSave || isSaving) return;
    setIsSaving(true);

    const payload = {
      name: name.trim(),
      description: description.trim() || null,
      actions: Object.entries(selectedActions).map(([device_id, action]) => ({ device_id, action })),
    };

    const ok = editing
      ? await editScenario(editing.id, payload)
      : await addScenario(payload);

    setIsSaving(false);
    if (ok) {
      navigation.goBack();
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
            <Text style={styles.eyebrow}>AUTOMATION</Text>
            <Text style={styles.title}>{editing ? "Edit scene" : "New scene"}</Text>
          </View>
          <AppPressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </AppPressable>
        </View>

        <View style={styles.aiPanel}>
          <View style={styles.aiTitleRow}>
            <View style={styles.aiIcon}>
              <Ionicons name="color-wand-outline" size={16} color={colors.accent} />
            </View>
            <Text style={styles.fieldLabel}>AI DRAFT</Text>
          </View>
          <View style={[styles.aiInputWrap, aiPromptFocused && styles.inputWrapFocused]}>
            <TextInput
              value={aiPrompt}
              onChangeText={setAiPrompt}
              placeholder="e.g. Turn off all lights and close the front door"
              placeholderTextColor={colors.ink400}
              style={styles.aiInput}
              onFocus={() => setAiPromptFocused(true)}
              onBlur={() => setAiPromptFocused(false)}
              multiline
            />
          </View>
          <AppPressable
            style={[styles.aiGenerateBtn, !canGenerateDraft && styles.aiGenerateBtnDisabled]}
            onPress={() => void generateDraft()}
            disabled={!canGenerateDraft}
          >
            {isGeneratingDraft ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="sparkles" size={15} color="#fff" />
            )}
            <Text style={styles.aiGenerateText}>
              {isGeneratingDraft ? "Generating..." : "Generate Draft"}
            </Text>
          </AppPressable>
          {aiDraftMessage ? <Text style={styles.aiResultText}>{aiDraftMessage}</Text> : null}
        </View>

        {/* Name */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>SCENE NAME</Text>
          <View style={[styles.inputWrap, nameFocused && styles.inputWrapFocused]}>
            <Ionicons name="flash-outline" size={18} color={colors.ink500} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="e.g. Movie Night"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
              autoFocus={!editing}
            />
          </View>
        </View>

        {/* Description */}
        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>DESCRIPTION (OPTIONAL)</Text>
          <View style={[styles.inputWrap, descFocused && styles.inputWrapFocused]}>
            <Ionicons name="text-outline" size={18} color={colors.ink500} />
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="What does this scene do?"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setDescFocused(true)}
              onBlur={() => setDescFocused(false)}
            />
          </View>
        </View>

        {/* Actions */}
        <View style={styles.fieldGroup}>
          <View style={styles.actionsHeader}>
            <Text style={styles.fieldLabel}>ACTIONS</Text>
            <Text style={styles.actionsCount}>{actionCount} SELECTED</Text>
          </View>

          {controllableDevices.length === 0 ? (
            <View style={styles.noDevices}>
              <Text style={styles.noDevicesText}>
                No controllable devices yet. Add a light, door or climate device first.
              </Text>
            </View>
          ) : (
            <View style={styles.deviceList}>
              {controllableDevices.map((device) => {
                const selected = selectedActions[device.id];
                return (
                  <View key={device.id} style={styles.deviceRow}>
                    <View style={styles.deviceIcon}>
                      <Ionicons
                        name={deviceIcons[device.type] ?? "hardware-chip-outline"}
                        size={17}
                        color={selected ? colors.accent : colors.ink500}
                      />
                    </View>
                    <View style={styles.deviceInfo}>
                      <Text style={styles.deviceName} numberOfLines={1}>{device.name}</Text>
                      <Text style={styles.deviceRoom} numberOfLines={1}>
                        {roomNameMap.get(device.room_id) ?? "Unknown room"}
                      </Text>
                    </View>
                    <View style={styles.choiceRow}>
                      {choicesForDevice(device).map((choice) => {
                        const active = selected === choice.action;
                        return (
                          <AppPressable
                            key={choice.action}
                            style={[styles.choiceChip, active && styles.choiceChipActive]}
                            onPress={() => toggleAction(device.id, choice.action)}
                          >
                            <Text style={[styles.choiceText, active && styles.choiceTextActive]}>
                              {choice.label}
                            </Text>
                          </AppPressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          )}
          <Text style={styles.helperText}>
            Tap On/Off (or Open/Close) to include a device. Tap again to remove it.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <AppPressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
          </AppPressable>
          <AppPressable
            style={[styles.saveBtn, (!canSave || isSaving) && styles.saveBtnDisabled]}
            onPress={() => void save()}
            disabled={!canSave || isSaving}
          >
            <Text style={styles.saveText}>
              {isSaving ? "Saving..." : editing ? "Save Changes" : "Create Scene"}
            </Text>
            {!isSaving && <Ionicons name={editing ? "checkmark" : "add"} size={18} color="#fff" />}
          </AppPressable>
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
  aiPanel: {
    gap: 10,
    padding: 14,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 14,
  },
  aiTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  aiIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.cream100,
    alignItems: "center",
    justifyContent: "center",
  },
  aiInputWrap: {
    minHeight: 74,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.cream50,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    borderRadius: 12,
  },
  aiInput: {
    minHeight: 50,
    color: colors.ink900,
    fontSize: 14.5,
    lineHeight: 20,
    textAlignVertical: "top",
  },
  aiGenerateBtn: {
    flexDirection: "row",
    height: 44,
    borderRadius: 999,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },
  aiGenerateBtnDisabled: {
    opacity: 0.45,
  },
  aiGenerateText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  aiResultText: {
    color: colors.ink600,
    fontSize: 12.5,
    lineHeight: 17,
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
  actionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  actionsCount: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink400,
    letterSpacing: 0.5,
  },
  deviceList: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    overflow: "hidden",
  },
  deviceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  deviceIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: colors.cream100,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  deviceInfo: {
    flex: 1,
    minWidth: 0,
  },
  deviceName: {
    color: colors.ink900,
    fontSize: 14.5,
    fontWeight: "500",
  },
  deviceRoom: {
    color: colors.ink500,
    fontSize: 12,
    marginTop: 1,
  },
  choiceRow: {
    flexDirection: "row",
    gap: 6,
    flexShrink: 0,
  },
  choiceChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  choiceChipActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  choiceText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: colors.ink700,
  },
  choiceTextActive: {
    color: "#fff",
  },
  helperText: {
    color: colors.ink500,
    fontSize: 12.5,
    lineHeight: 17,
  },
  noDevices: {
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  noDevicesText: {
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
});
