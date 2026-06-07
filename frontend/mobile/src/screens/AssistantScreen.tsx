import { Ionicons } from "@expo/vector-icons";
import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppPressable } from "../components/AppPressable";
import { ScreenHeader } from "../components/ScreenHeader";
import { tabBarHeight } from "../components/TabBar";
import type {
  AIAssistantControlProposal,
  AIAssistantScenarioRunProposal,
  AIScenarioDraft,
} from "../api/ai";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import { spacing } from "../theme/spacing";
import type { DeviceAction } from "../types/smartHome";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  scenarioDraft?: AIScenarioDraft | null;
  controlProposal?: AIAssistantControlProposal | null;
  scenarioRun?: AIAssistantScenarioRunProposal | null;
};

const STARTER_PROMPTS = [
  "What is turned on right now?",
  "Summarize today's activity",
  "Create an away mode scene",
];

function makeMessageId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function actionLabel(action: DeviceAction): string {
  if (action === "TURN_ON") return "Turn on";
  if (action === "TURN_OFF") return "Turn off";
  if (action === "OPEN") return "Open";
  return "Close";
}

// Height of the floating input bar (its padding + the input's min height).
const INPUT_BAR_HEIGHT = 58;

export function AssistantScreen() {
  const insets = useSafeAreaInsets();
  const navBarHeight = tabBarHeight(insets.bottom);
  // Park the input bar just above the floating nav bar, and pad the scroll
  // content so the last message clears both.
  const inputBarBottom = navBarHeight + 8;
  const contentBottomPadding = inputBarBottom + INPUT_BAR_HEIGHT + 16;

  const {
    addScenario,
    confirmAssistantDeviceActions,
    devices,
    runScenario,
    sendAssistantMessage,
  } = useSmartHome();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Hi. What should we look at first?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [savingDraftId, setSavingDraftId] = useState<string | null>(null);
  const [confirmingActionId, setConfirmingActionId] = useState<string | null>(null);
  const [runningScenarioId, setRunningScenarioId] = useState<string | null>(null);
  const [savedDraftIds, setSavedDraftIds] = useState<string[]>([]);
  const [confirmedActionIds, setConfirmedActionIds] = useState<string[]>([]);
  const [confirmedScenarioIds, setConfirmedScenarioIds] = useState<string[]>([]);

  const deviceNameById = useMemo(
    () => new Map(devices.map((device) => [device.id, device.name])),
    [devices]
  );

  const submitMessage = async (preset?: string) => {
    const text = (preset ?? input).trim();
    if (!text || isSending) return;

    const userMessage: ChatMessage = {
      id: makeMessageId("user"),
      role: "user",
      text,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const response = await sendAssistantMessage(text);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: response.answer,
          scenarioDraft: response.scenario_draft,
          controlProposal: response.control_proposal,
          scenarioRun: response.scenario_run,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: error instanceof Error ? error.message : "Assistant request failed",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const saveDraft = async (messageId: string, draft: AIScenarioDraft) => {
    if (savingDraftId) return;
    setSavingDraftId(messageId);
    const ok = await addScenario({
      name: draft.name,
      description: draft.description,
      actions: draft.actions,
    });
    setSavingDraftId(null);

    if (ok) {
      setSavedDraftIds((prev) => [...prev, messageId]);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: `"${draft.name}" was saved to Scenes.`,
        },
      ]);
    }
  };

  const confirmActions = async (messageId: string, proposal: AIAssistantControlProposal) => {
    if (confirmingActionId) return;
    setConfirmingActionId(messageId);

    try {
      const result = await confirmAssistantDeviceActions(proposal.actions);
      setConfirmedActionIds((prev) => [...prev, messageId]);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: result.message,
        },
      ]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: error instanceof Error ? error.message : "Action confirmation failed",
        },
      ]);
    } finally {
      setConfirmingActionId(null);
    }
  };

  const confirmScenarioRun = async (messageId: string, scenarioRun: AIAssistantScenarioRunProposal) => {
    if (runningScenarioId) return;
    setRunningScenarioId(messageId);

    const result = await runScenario(scenarioRun.scenario_id);
    setRunningScenarioId(null);

    if (result) {
      setConfirmedScenarioIds((prev) => [...prev, messageId]);
      setMessages((prev) => [
        ...prev,
        {
          id: makeMessageId("assistant"),
          role: "assistant",
          text: `"${scenarioRun.name}" is running.`,
        },
      ]);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.screen}
    >
      <ScreenHeader
        eyebrow="AI ASSISTANT"
        title="Assistant"
        subtitle="Your secure smart home context."
        secure
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: contentBottomPadding }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.promptRow}>
          {STARTER_PROMPTS.map((prompt) => (
            <AppPressable
              key={prompt}
              style={styles.promptChip}
              onPress={() => void submitMessage(prompt)}
              disabled={isSending}
            >
              <Text style={styles.promptText}>{prompt}</Text>
            </AppPressable>
          ))}
        </View>

        <View style={styles.messageList}>
          {messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <View
                key={message.id}
                style={[styles.messageRow, isUser && styles.messageRowUser]}
              >
                <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
                  <Text style={[styles.bubbleText, isUser && styles.userBubbleText]}>
                    {message.text}
                  </Text>
                  {message.scenarioDraft ? (
                    <View style={styles.draftBox}>
                      <View style={styles.draftHeader}>
                        <Ionicons name="flash-outline" size={16} color={colors.accent} />
                        <View style={styles.draftTitleWrap}>
                          <Text style={styles.draftName}>{message.scenarioDraft.name}</Text>
                          {message.scenarioDraft.description ? (
                            <Text style={styles.draftDescription}>
                              {message.scenarioDraft.description}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <View style={styles.draftActionList}>
                        {message.scenarioDraft.actions.map((action) => (
                          <View key={`${action.device_id}:${action.action}`} style={styles.draftActionRow}>
                            <Text style={styles.draftActionDevice}>
                              {deviceNameById.get(action.device_id) ?? "Unknown device"}
                            </Text>
                            <Text style={styles.draftActionValue}>{actionLabel(action.action)}</Text>
                          </View>
                        ))}
                      </View>
                      <AppPressable
                        style={[
                          styles.saveDraftBtn,
                          savedDraftIds.includes(message.id) && styles.saveDraftBtnSaved,
                        ]}
                        disabled={savedDraftIds.includes(message.id) || savingDraftId === message.id}
                        onPress={() => void saveDraft(message.id, message.scenarioDraft!)}
                      >
                        {savingDraftId === message.id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Ionicons
                            name={savedDraftIds.includes(message.id) ? "checkmark" : "add"}
                            size={15}
                            color="#fff"
                          />
                        )}
                        <Text style={styles.saveDraftText}>
                          {savedDraftIds.includes(message.id) ? "Saved" : "Save Scene"}
                        </Text>
                      </AppPressable>
                    </View>
                  ) : null}
                  {message.controlProposal ? (
                    <View style={styles.draftBox}>
                      <View style={styles.draftHeader}>
                        <Ionicons name="toggle-outline" size={16} color={colors.warn} />
                        <View style={styles.draftTitleWrap}>
                          <Text style={styles.draftName}>Confirm actions</Text>
                          <Text style={styles.draftDescription}>
                            {message.controlProposal.explanation}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.draftActionList}>
                        {message.controlProposal.actions.map((action) => (
                          <View key={`${action.device_id}:${action.action}`} style={styles.draftActionRow}>
                            <Text style={styles.draftActionDevice}>
                              {deviceNameById.get(action.device_id) ?? "Unknown device"}
                            </Text>
                            <Text style={styles.draftActionValue}>{actionLabel(action.action)}</Text>
                          </View>
                        ))}
                      </View>
                      <AppPressable
                        style={[
                          styles.saveDraftBtn,
                          styles.confirmBtn,
                          confirmedActionIds.includes(message.id) && styles.saveDraftBtnSaved,
                        ]}
                        disabled={confirmedActionIds.includes(message.id) || confirmingActionId === message.id}
                        onPress={() => void confirmActions(message.id, message.controlProposal!)}
                      >
                        {confirmingActionId === message.id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Ionicons
                            name={confirmedActionIds.includes(message.id) ? "checkmark" : "shield-checkmark"}
                            size={15}
                            color="#fff"
                          />
                        )}
                        <Text style={styles.saveDraftText}>
                          {confirmedActionIds.includes(message.id) ? "Confirmed" : "Confirm Actions"}
                        </Text>
                      </AppPressable>
                    </View>
                  ) : null}
                  {message.scenarioRun ? (
                    <View style={styles.draftBox}>
                      <View style={styles.draftHeader}>
                        <Ionicons name="play-outline" size={16} color={colors.success} />
                        <View style={styles.draftTitleWrap}>
                          <Text style={styles.draftName}>{message.scenarioRun.name}</Text>
                          <Text style={styles.draftDescription}>
                            {message.scenarioRun.explanation}
                          </Text>
                        </View>
                      </View>
                      <AppPressable
                        style={[
                          styles.saveDraftBtn,
                          styles.runScenarioBtn,
                          confirmedScenarioIds.includes(message.id) && styles.saveDraftBtnSaved,
                        ]}
                        disabled={confirmedScenarioIds.includes(message.id) || runningScenarioId === message.id}
                        onPress={() => void confirmScenarioRun(message.id, message.scenarioRun!)}
                      >
                        {runningScenarioId === message.id ? (
                          <ActivityIndicator color="#fff" />
                        ) : (
                          <Ionicons
                            name={confirmedScenarioIds.includes(message.id) ? "checkmark" : "play"}
                            size={15}
                            color="#fff"
                          />
                        )}
                        <Text style={styles.saveDraftText}>
                          {confirmedScenarioIds.includes(message.id) ? "Running" : "Run Scenario"}
                        </Text>
                      </AppPressable>
                    </View>
                  ) : null}
                </View>
              </View>
            );
          })}
          {isSending ? (
            <View style={styles.typingRow}>
              <ActivityIndicator color={colors.accent} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      <View style={[styles.inputBar, { bottom: inputBarBottom }]}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Message SSHome"
          placeholderTextColor={colors.ink400}
          style={styles.input}
          multiline
        />
        <AppPressable
          style={[styles.sendBtn, (!input.trim() || isSending) && styles.sendBtnDisabled]}
          disabled={!input.trim() || isSending}
          onPress={() => void submitMessage()}
        >
          <Ionicons name="send" size={17} color="#fff" />
        </AppPressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  content: {
    paddingHorizontal: 20,
    gap: spacing.md,
  },
  promptRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  promptChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  promptText: {
    color: colors.ink700,
    fontSize: 12.5,
    fontWeight: "600",
  },
  messageList: {
    gap: 12,
  },
  messageRow: {
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  messageRowUser: {
    justifyContent: "flex-end",
  },
  bubble: {
    maxWidth: "88%",
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  assistantBubble: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  userBubble: {
    backgroundColor: colors.ink900,
  },
  bubbleText: {
    color: colors.ink800,
    fontSize: 14.5,
    lineHeight: 20,
  },
  userBubbleText: {
    color: "#fff",
  },
  draftBox: {
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.cream50,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  draftHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  draftTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  draftName: {
    color: colors.ink900,
    fontSize: 14.5,
    fontWeight: "700",
  },
  draftDescription: {
    color: colors.ink500,
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 2,
  },
  draftActionList: {
    gap: 6,
  },
  draftActionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  draftActionDevice: {
    flex: 1,
    minWidth: 0,
    color: colors.ink700,
    fontSize: 12.5,
  },
  draftActionValue: {
    color: colors.accent,
    fontSize: 12.5,
    fontWeight: "700",
  },
  saveDraftBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.accent,
    gap: 6,
  },
  saveDraftBtnSaved: {
    backgroundColor: colors.success,
  },
  confirmBtn: {
    backgroundColor: colors.warn,
  },
  runScenarioBtn: {
    backgroundColor: colors.success,
  },
  saveDraftText: {
    color: "#fff",
    fontSize: 13.5,
    fontWeight: "700",
  },
  typingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
  },
  typingText: {
    color: colors.ink500,
    fontSize: 13,
  },
  inputBar: {
    position: "absolute",
    left: 12,
    right: 12,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    padding: 8,
    borderRadius: 22,
    backgroundColor: "rgba(250, 251, 252, 0.96)",
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  input: {
    flex: 1,
    maxHeight: 110,
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
    backgroundColor: colors.surface,
    color: colors.ink900,
    fontSize: 14.5,
    lineHeight: 20,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.45,
  },
});
