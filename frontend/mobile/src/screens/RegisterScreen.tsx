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
  const [role, setRole] = useState<"USER" | "ADMIN">("USER");
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
          <Pressable onPress={onSwitchToLogin} style={styles.backButton}>
            <Ionicons name="chevron-back" size={16} color={colors.ink700} />
            <Text style={styles.backText}>Back</Text>
          </Pressable>
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
            <Text style={styles.fieldLabel}>ROLE</Text>
            <View style={styles.roleRow}>
              <Pressable
                onPress={() => setRole("USER")}
                style={[styles.roleChip, role === "USER" && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, role === "USER" && styles.roleChipTextActive]}>
                  USER
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setRole("ADMIN")}
                style={[styles.roleChip, role === "ADMIN" && styles.roleChipActive]}
              >
                <Text style={[styles.roleChipText, role === "ADMIN" && styles.roleChipTextActive]}>
                  ADMIN
                </Text>
              </Pressable>
            </View>
          </View>

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
              <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPw ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={colors.ink500}
                />
              </Pressable>
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
            <Pressable onPress={() => setShowConfirm((v) => !v)} style={styles.eyeBtn}>
              <Ionicons
                name={showConfirm ? "eye-off-outline" : "eye-outline"}
                size={18}
                color={colors.ink500}
              />
            </Pressable>
          </Field>

          {/* Info box */}
          <View style={styles.infoBox}>
            <Ionicons name="server-outline" size={16} color={colors.ink500} />
            <Text style={styles.infoText}>
              Your data lives on your home server. We never see your credentials.
            </Text>
          </View>

          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={() => onSubmit({ name, email, phone, password, confirmPassword, role })}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>
              {isSubmitting ? "Creating account…" : "Create Account"}
            </Text>
            {!isSubmitting && <Ionicons name="chevron-forward" size={18} color="#fff" />}
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Already have an account?{" "}</Text>
            <Pressable onPress={onSwitchToLogin}>
              <Text style={styles.footerLink}>Sign in</Text>
            </Pressable>
          </View>
          <Text style={styles.termsText}>
            By continuing you agree to the Terms of Service{"\n"}and the Local-First Privacy Notice.
          </Text>
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
  hero: {
    position: "relative",
    overflow: "hidden",
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    backgroundColor: colors.cream100,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.hairline,
  },
  blob1: {
    position: "absolute",
    top: -80,
    right: -60,
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: colors.accentTint,
    opacity: 0.6,
  },
  blobRing: {
    position: "absolute",
    top: 40,
    right: 60,
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    position: "relative",
  },
  brandMark: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
  },
  brandLabel: {
    fontFamily: "monospace",
    fontSize: 12,
    color: colors.ink700,
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -1,
    lineHeight: 42,
    marginTop: 28,
    position: "relative",
  },
  heroAccent: {
    color: colors.accent,
  },
  heroSub: {
    marginTop: 8,
    fontSize: 14,
    color: colors.ink500,
    lineHeight: 20,
    position: "relative",
  },
  pillRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 16,
    position: "relative",
  },
  secPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: colors.ink100,
  },
  secPillSuccess: {
    backgroundColor: colors.successSoft,
  },
  secPillText: {
    fontFamily: "monospace",
    fontSize: 10,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 0.3,
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
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 14,
    borderRadius: 12,
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  infoText: {
    flex: 1,
    color: colors.ink500,
    fontSize: 13,
    lineHeight: 18,
  },
  roleRow: {
    flexDirection: "row",
    gap: 10,
  },
  roleChip: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
  },
  roleChipActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  roleChipText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.4,
  },
  roleChipTextActive: {
    color: "#fff",
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
  termsText: {
    color: colors.ink500,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
});
