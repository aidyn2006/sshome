import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { RegisterPayload } from "../types/auth";
import { colors } from "../theme/colors";

type Props = {
  appTitle: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onSwitchToLogin: () => void;
  onSubmit: (payload: RegisterPayload) => Promise<void> | void;
};

function getStrength(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (pw.length === 0) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score as 0 | 1 | 2 | 3 | 4;
}

const STRENGTH_LABEL = ["-", "Weak", "Fair", "Strong", "Excellent"] as const;
const STRENGTH_COLOR = [colors.ink300, colors.danger, colors.warn, colors.info, colors.success] as const;

export function RegisterScreen({
  appTitle,
  isSubmitting = false,
  errorMessage,
  onSwitchToLogin,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [nameFocused, setNameFocused] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [phoneFocused, setPhoneFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);

  const strength = getStrength(password);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Compact header */}
        <View style={styles.compactHeader}>
          <AppPressable onPress={onSwitchToLogin} style={styles.backButton}>
            <Ionicons name="chevron-back" size={16} color={colors.ink700} />
            <Text style={styles.backText}>Back</Text>
          </AppPressable>
          <Text style={styles.compactTitle}>
            Make yourself <Text style={styles.heroAccent}>at home.</Text>
          </Text>
          <Text style={styles.compactSub}>
            Takes about 30 seconds. We'll set up your first home next.
          </Text>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          <Field label="FULL NAME" focused={nameFocused}>
            <Ionicons name="person-outline" size={18} color={colors.ink500} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your full name"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setNameFocused(true)}
              onBlur={() => setNameFocused(false)}
            />
          </Field>

          <Field label="EMAIL" focused={emailFocused}>
            <Ionicons name="mail-outline" size={18} color={colors.ink500} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@home.com"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setEmailFocused(true)}
              onBlur={() => setEmailFocused(false)}
            />
          </Field>

          <Field label="PHONE (OPTIONAL)" focused={phoneFocused}>
            <Ionicons name="call-outline" size={18} color={colors.ink500} />
            <TextInput
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholder="+7 777 123 45 67"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setPhoneFocused(true)}
              onBlur={() => setPhoneFocused(false)}
            />
          </Field>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrap, pwFocused && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="At least 8 characters"
                placeholderTextColor={colors.ink400}
                style={styles.input}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
              />
              <AppPressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.ink500}
                />
              </AppPressable>
            </View>
            {/* Strength meter */}
            {password.length > 0 && (
              <View style={styles.strengthRow}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((i) => (
                    <View
                      key={i}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: i <= strength ? STRENGTH_COLOR[strength] : colors.ink100 },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthLabel, { color: STRENGTH_COLOR[strength] }]}>
                  {STRENGTH_LABEL[strength].toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Field label="CONFIRM PASSWORD" focused={confirmFocused}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
            <TextInput
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirm}
              placeholder="Repeat password"
              placeholderTextColor={colors.ink400}
              style={styles.input}
              onFocus={() => setConfirmFocused(true)}
              onBlur={() => setConfirmFocused(false)}
            />
            <AppPressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.ink500}
              />
            </AppPressable>
          </Field>

          <AppPressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={() => onSubmit({ name, email, phone, password, confirmPassword })}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? "Creating account…" : "Create Account"}
            </Text>
            {!isSubmitting && <Ionicons name="chevron-forward" size={18} color="#fff" />}
          </AppPressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?{" "}</Text>
            <AppPressable onPress={onSwitchToLogin}>
              <Text style={styles.footerLink}>Sign in</Text>
            </AppPressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  focused,
  children,
}: {
  label: string;
  focused: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.fieldGroup}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={[styles.inputWrap, focused && styles.inputWrapFocused]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.cream50,
  },
  scroll: {
    flexGrow: 1,
  },
  compactHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  backButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  backText: {
    color: colors.ink700,
    fontSize: 14,
  },
  compactTitle: {
    marginTop: 18,
    fontSize: 30,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.9,
    lineHeight: 34,
  },
  compactSub: {
    marginTop: 4,
    fontSize: 13.5,
    color: colors.ink500,
    lineHeight: 19,
  },
  heroAccent: {
    color: colors.accent,
  },
  form: {
    flex: 1,
    padding: 24,
    gap: 14,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.dangerSoft,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    fontSize: 14,
    fontWeight: "500",
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
  eyeBtn: {
    padding: 4,
  },
  strengthRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  strengthBars: {
    flexDirection: "row",
    gap: 4,
    flex: 1,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  strengthLabel: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.5,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    marginTop: 4,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
  },
  footerText: {
    color: colors.ink500,
    fontSize: 14,
  },
  footerLink: {
    color: colors.ink900,
    fontSize: 14,
    fontWeight: "500",
    textDecorationLine: "underline",
  },
});
