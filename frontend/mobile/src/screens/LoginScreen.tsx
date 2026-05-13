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

import type { LoginPayload } from "../types/auth";
import { colors } from "../theme/colors";

type Props = {
  appTitle: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onSwitchToRegister: () => void;
  onSubmit: (payload: LoginPayload) => Promise<void> | void;
};

export function LoginScreen({
  appTitle,
  isSubmitting = false,
  errorMessage,
  onSwitchToRegister,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.wrap}
    >
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top }]} keyboardShouldPersistTaps="handled">

        {/* Hero banner */}
        <View style={styles.hero}>
          {/* decorative blobs */}
          <View style={styles.blob1} />
          <View style={styles.blobRing} />

          {/* brand */}
          <View style={styles.brandRow}>
            <View style={styles.brandMark}>
              <Ionicons name="home-outline" size={16} color={colors.cream50} />
            </View>
            <Text style={styles.brandLabel}>SSHOME · SANCTUM</Text>
          </View>

          <Text style={styles.heroTitle}>Welcome{"\n"}<Text style={styles.heroAccent}>home.</Text></Text>
          <Text style={styles.heroSub}>Sign in to control your house, your way.</Text>

          {/* security pills */}
          <View style={styles.pillRow}>
            <View style={[styles.secPill, styles.secPillSuccess]}>
              <Ionicons name="lock-closed" size={11} color={colors.success} />
              <Text style={[styles.secPillText, { color: colors.success }]}>ENCRYPTED · TLS 1.3</Text>
            </View>
            <View style={styles.secPill}>
              <Text style={styles.secPillText}>JWT · REFRESH ROTATE</Text>
            </View>
          </View>
        </View>

        {/* Form */}
        <View style={styles.form}>
          {errorMessage ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>EMAIL</Text>
            <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
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
            </View>
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>PASSWORD</Text>
            <View style={[styles.inputWrap, pwFocused && styles.inputWrapFocused]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
              <TextInput
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPw}
                placeholder="••••••••"
                placeholderTextColor={colors.ink400}
                style={styles.input}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
              />
              <Pressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.ink500} />
              </Pressable>
            </View>
          </View>

          {/* Remember + Forgot row */}
          <View style={styles.optionsRow}>
            <View style={styles.checkRow}>
              <View style={styles.checkBox}>
                <Ionicons name="checkmark" size={12} color={colors.accent} />
              </View>
              <Text style={styles.checkLabel}>Remember this device</Text>
            </View>
            <Text style={styles.forgotLink}>Forgot?</Text>
          </View>

          {/* CTA */}
          <Pressable
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={() => onSubmit({ email, password })}
            disabled={isSubmitting}
          >
            <Text style={styles.submitText}>{isSubmitting ? "Authorizing…" : "Sign In"}</Text>
            {!isSubmitting && <Ionicons name="chevron-forward" size={18} color="#fff" />}
          </Pressable>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.divLine} />
            <Text style={styles.divText}>OR</Text>
            <View style={styles.divLine} />
          </View>

          {/* Alt sign-in */}
          <View style={styles.altRow}>
            <Pressable style={styles.altBtn}>
              <Ionicons name="finger-print-outline" size={18} color={colors.ink700} />
              <Text style={styles.altText}>Face ID</Text>
            </Pressable>
            <Pressable style={styles.altBtn}>
              <Ionicons name="key-outline" size={18} color={colors.ink700} />
              <Text style={styles.altText}>Single Sign-On</Text>
            </Pressable>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>New to SSHome?{" "}</Text>
            <Pressable onPress={onSwitchToRegister}>
              <Text style={styles.footerLink}>Create an account</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  // hero
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
    fontSize: 42,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -1,
    lineHeight: 46,
    marginTop: 32,
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
  // form
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
  optionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  checkBox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: {
    fontSize: 13,
    color: colors.ink700,
  },
  forgotLink: {
    fontSize: 13,
    color: colors.ink700,
    textDecorationLine: "underline",
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
  divider: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  divLine: {
    flex: 1,
    height: 0.5,
    backgroundColor: colors.hairlineStrong,
  },
  divText: {
    fontFamily: "monospace",
    fontSize: 10,
    color: colors.ink400,
    letterSpacing: 1,
  },
  altRow: {
    flexDirection: "row",
    gap: 10,
  },
  altBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 48,
    borderRadius: 999,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  altText: {
    color: colors.ink700,
    fontSize: 14,
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
