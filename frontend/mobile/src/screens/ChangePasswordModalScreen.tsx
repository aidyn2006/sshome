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

type Props = NativeStackScreenProps<RootStackParamList, "ChangePasswordModal">;
type FieldName = "current" | "new" | "confirm";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "Unable to change password.";
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "Use at least 8 characters.";
  }

  if (!/[A-Z]/.test(password)) {
    return "Add at least one uppercase letter.";
  }

  if (!/\d/.test(password)) {
    return "Add at least one number.";
  }

  return null;
}

export function ChangePasswordModalScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { changePassword } = useSmartHome();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [focusedField, setFocusedField] = useState<FieldName | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const canSave =
    currentPassword.length > 0 &&
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    !isSaving;

  const save = async () => {
    if (!canSave) {
      return;
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      setSuccess(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      setSuccess(false);
      return;
    }

    if (currentPassword === newPassword) {
      setError("New password must be different.");
      setSuccess(false);
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccess(false);

    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess(true);
      setTimeout(() => navigation.goBack(), 650);
    } catch (changePasswordError) {
      setError(getErrorMessage(changePasswordError));
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
            <Text style={styles.eyebrow}>ACCOUNT</Text>
            <Text style={styles.title}>Change password</Text>
          </View>
          <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()}>
            <Ionicons name="close" size={18} color={colors.ink700} />
          </Pressable>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CURRENT PASSWORD</Text>
          <PasswordField
            icon="lock-closed-outline"
            value={currentPassword}
            placeholder="Current password"
            focused={focusedField === "current"}
            onChangeText={setCurrentPassword}
            onFocus={() => setFocusedField("current")}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => void save()}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
          <PasswordField
            icon="key-outline"
            value={newPassword}
            placeholder="New password"
            focused={focusedField === "new"}
            onChangeText={setNewPassword}
            onFocus={() => setFocusedField("new")}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => void save()}
          />
          <Text style={styles.hint}>Minimum 8 characters, one uppercase letter, and one number.</Text>
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
          <PasswordField
            icon="shield-checkmark-outline"
            value={confirmPassword}
            placeholder="Repeat new password"
            focused={focusedField === "confirm"}
            onChangeText={setConfirmPassword}
            onFocus={() => setFocusedField("confirm")}
            onBlur={() => setFocusedField(null)}
            onSubmitEditing={() => void save()}
          />
        </View>

        {error && (
          <View style={[styles.message, styles.errorMessage]}>
            <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
            <Text style={[styles.messageText, styles.errorText]}>{error}</Text>
          </View>
        )}

        {success && (
          <View style={[styles.message, styles.successMessage]}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
            <Text style={[styles.messageText, styles.successText]}>Password updated.</Text>
          </View>
        )}

        <View style={styles.actions}>
          <Pressable style={styles.cancelBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelText}>Cancel</Text>
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

function PasswordField({
  icon,
  value,
  placeholder,
  focused,
  onChangeText,
  onFocus,
  onBlur,
  onSubmitEditing,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  placeholder: string;
  focused: boolean;
  onChangeText: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onSubmitEditing: () => void;
}) {
  return (
    <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>
      <Ionicons name={icon} size={18} color={colors.ink500} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.ink400}
        style={styles.input}
        secureTextEntry
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        onFocus={onFocus}
        onBlur={onBlur}
        returnKeyType="done"
        onSubmitEditing={onSubmitEditing}
      />
    </View>
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
  hint: {
    color: colors.ink500,
    fontSize: 12.5,
    lineHeight: 17,
  },
  message: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 42,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 0.5,
  },
  errorMessage: {
    backgroundColor: colors.dangerSoft,
    borderColor: "rgba(199, 37, 62, 0.18)",
  },
  successMessage: {
    backgroundColor: colors.successSoft,
    borderColor: "rgba(5, 142, 90, 0.18)",
  },
  messageText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: "500",
  },
  errorText: {
    color: colors.danger,
  },
  successText: {
    color: colors.success,
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
    color: colors.onAccent,
    fontSize: 15,
    fontWeight: "500",
  },
});
