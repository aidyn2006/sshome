import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { AppPressable } from "../components/AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type { LoginPayload } from "../types/auth";
import {
  confirmPasswordReset,
  requestPasswordReset,
  verifyPasswordResetCode,
} from "../api/auth";
import { isApiError } from "../api/client";
import { preloadGoogleIdentity } from "../utils/googleAuth";
import { colors } from "../theme/colors";

type Props = {
  appTitle: string;
  isSubmitting?: boolean;
  errorMessage?: string;
  onSwitchToRegister: () => void;
  onGoogleSubmit: () => Promise<void> | void;
  onSubmit: (payload: LoginPayload) => Promise<void> | void;
};

type ResetStep = "request" | "code" | "password";

function getResetErrorMessage(error: unknown, fallback: string): string {
  if (isApiError(error) && error.message.trim()) {
    return error.message;
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function LoginScreen({
  appTitle,
  isSubmitting = false,
  errorMessage,
  onSwitchToRegister,
  onGoogleSubmit,
  onSubmit,
}: Props) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMode, setAuthMode] = useState<"login" | "reset">("login");
  const [resetStep, setResetStep] = useState<ResetStep>("request");
  const [resetEmail, setResetEmail] = useState("");
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetMessage, setResetMessage] = useState<string | null>(null);
  const [resetError, setResetError] = useState<string | null>(null);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);
  const [resetEmailFocused, setResetEmailFocused] = useState(false);
  const [resetCodeFocused, setResetCodeFocused] = useState(false);
  const [newPwFocused, setNewPwFocused] = useState(false);
  const [confirmPwFocused, setConfirmPwFocused] = useState(false);
  const [loginNotice, setLoginNotice] = useState<string | null>(null);
  const isBusy = isSubmitting || isResetSubmitting;

  useEffect(() => {
    if (Platform.OS === "web") {
      preloadGoogleIdentity().catch(() => undefined);
    }
  }, []);

  const openPasswordReset = () => {
    setAuthMode("reset");
    setResetStep("request");
    setResetEmail(email.trim());
    setResetCode("");
    setNewPassword("");
    setConfirmNewPassword("");
    setResetMessage(null);
    setResetError(null);
    setLoginNotice(null);
  };

  const returnToLogin = () => {
    setAuthMode("login");
    setResetStep("request");
    setResetError(null);
    setResetMessage(null);
  };

  const handleRequestReset = async () => {
    const nextEmail = resetEmail.trim();

    if (!nextEmail) {
      setResetError("Enter your email address");
      return;
    }

    setIsResetSubmitting(true);
    setResetError(null);
    setResetMessage(null);

    try {
      await requestPasswordReset({ email: nextEmail });
      setResetEmail(nextEmail);
      setResetStep("code");
      setResetMessage("If that email exists, a 6-digit code has been sent.");
    } catch (error) {
      setResetError(getResetErrorMessage(error, "Unable to send reset code"));
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleVerifyResetCode = async () => {
    const code = resetCode.trim();

    if (!/^\d{6}$/.test(code)) {
      setResetError("Enter the 6-digit code from your email");
      return;
    }

    setIsResetSubmitting(true);
    setResetError(null);
    setResetMessage(null);

    try {
      await verifyPasswordResetCode({ email: resetEmail, code });
      setResetCode(code);
      setResetStep("password");
      setResetMessage("Code confirmed. Set a new password.");
    } catch (error) {
      setResetError(getResetErrorMessage(error, "Unable to verify reset code"));
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const handleConfirmReset = async () => {
    if (newPassword !== confirmNewPassword) {
      setResetError("Passwords do not match");
      return;
    }

    if (newPassword.length < 8) {
      setResetError("Password must be at least 8 characters");
      return;
    }

    setIsResetSubmitting(true);
    setResetError(null);
    setResetMessage(null);

    try {
      await confirmPasswordReset({
        email: resetEmail,
        code: resetCode,
        new_password: newPassword,
      });
      setEmail(resetEmail);
      setPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
      setLoginNotice("Password updated. Sign in with your new password.");
      returnToLogin();
    } catch (error) {
      setResetError(getResetErrorMessage(error, "Unable to reset password"));
    } finally {
      setIsResetSubmitting(false);
    }
  };

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
        </View>

        <View style={styles.form}>
          {authMode === "login" && loginNotice ? (
            <View style={styles.successBox}>
              <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
              <Text style={styles.successText}>{loginNotice}</Text>
            </View>
          ) : null}

          {(authMode === "login" ? errorMessage : resetError) ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
              <Text style={styles.errorText}>{authMode === "login" ? errorMessage : resetError}</Text>
            </View>
          ) : null}

          {authMode === "reset" ? (
            <>
              <AppPressable onPress={returnToLogin} style={styles.backButton} disabled={isResetSubmitting}>
                <Ionicons name="chevron-back" size={16} color={colors.ink700} />
                <Text style={styles.backText}>Back to sign in</Text>
              </AppPressable>

              <View style={styles.resetHeader}>
                <Text style={styles.resetTitle}>Reset password</Text>
                <Text style={styles.resetSub}>
                  {resetStep === "request"
                    ? "We'll send a confirmation code to your email."
                    : resetStep === "code"
                      ? `Enter the 6-digit code sent to ${resetEmail}.`
                      : "Choose a new password for your account."}
                </Text>
              </View>

              {resetMessage ? (
                <View style={styles.successBox}>
                  <Ionicons name="checkmark-circle-outline" size={16} color={colors.success} />
                  <Text style={styles.successText}>{resetMessage}</Text>
                </View>
              ) : null}

              {resetStep === "request" ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>EMAIL</Text>
                    <View style={[styles.inputWrap, resetEmailFocused && styles.inputWrapFocused]}>
                      <Ionicons name="mail-outline" size={18} color={colors.ink500} />
                      <TextInput
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        autoCapitalize="none"
                        keyboardType="email-address"
                        placeholder="you@home.com"
                        placeholderTextColor={colors.ink400}
                        style={styles.input}
                        onFocus={() => setResetEmailFocused(true)}
                        onBlur={() => setResetEmailFocused(false)}
                      />
                    </View>
                  </View>

                  <AppPressable
                    style={[styles.submitBtn, isResetSubmitting && styles.submitBtnDisabled]}
                    onPress={handleRequestReset}
                    disabled={isResetSubmitting}
                  >
                    <Text style={styles.submitText}>{isResetSubmitting ? "Sending…" : "Send Code"}</Text>
                    {!isResetSubmitting && <Ionicons name="mail-outline" size={18} color="#fff" />}
                  </AppPressable>
                </>
              ) : null}

              {resetStep === "code" ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>CONFIRMATION CODE</Text>
                    <View style={[styles.inputWrap, resetCodeFocused && styles.inputWrapFocused]}>
                      <Ionicons name="keypad-outline" size={18} color={colors.ink500} />
                      <TextInput
                        value={resetCode}
                        onChangeText={setResetCode}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="000000"
                        placeholderTextColor={colors.ink400}
                        style={styles.input}
                        onFocus={() => setResetCodeFocused(true)}
                        onBlur={() => setResetCodeFocused(false)}
                      />
                    </View>
                  </View>

                  <AppPressable
                    style={[styles.submitBtn, isResetSubmitting && styles.submitBtnDisabled]}
                    onPress={handleVerifyResetCode}
                    disabled={isResetSubmitting}
                  >
                    <Text style={styles.submitText}>{isResetSubmitting ? "Checking…" : "Confirm Code"}</Text>
                    {!isResetSubmitting && <Ionicons name="checkmark" size={18} color="#fff" />}
                  </AppPressable>

                  <AppPressable
                    onPress={handleRequestReset}
                    style={styles.secondaryLinkButton}
                    disabled={isResetSubmitting}
                  >
                    <Text style={styles.secondaryLinkText}>Send a new code</Text>
                  </AppPressable>
                </>
              ) : null}

              {resetStep === "password" ? (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>NEW PASSWORD</Text>
                    <View style={[styles.inputWrap, newPwFocused && styles.inputWrapFocused]}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
                      <TextInput
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPw}
                        placeholder="At least 8 characters"
                        placeholderTextColor={colors.ink400}
                        style={styles.input}
                        onFocus={() => setNewPwFocused(true)}
                        onBlur={() => setNewPwFocused(false)}
                      />
                      <AppPressable onPress={() => setShowNewPw((v) => !v)} style={styles.eyeBtn}>
                        <Ionicons
                          name={showNewPw ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={colors.ink500}
                        />
                      </AppPressable>
                    </View>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>CONFIRM PASSWORD</Text>
                    <View style={[styles.inputWrap, confirmPwFocused && styles.inputWrapFocused]}>
                      <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
                      <TextInput
                        value={confirmNewPassword}
                        onChangeText={setConfirmNewPassword}
                        secureTextEntry={!showConfirmPw}
                        placeholder="Repeat password"
                        placeholderTextColor={colors.ink400}
                        style={styles.input}
                        onFocus={() => setConfirmPwFocused(true)}
                        onBlur={() => setConfirmPwFocused(false)}
                      />
                      <AppPressable onPress={() => setShowConfirmPw((v) => !v)} style={styles.eyeBtn}>
                        <Ionicons
                          name={showConfirmPw ? "eye-off-outline" : "eye-outline"}
                          size={18}
                          color={colors.ink500}
                        />
                      </AppPressable>
                    </View>
                  </View>

                  <AppPressable
                    style={[styles.submitBtn, isResetSubmitting && styles.submitBtnDisabled]}
                    onPress={handleConfirmReset}
                    disabled={isResetSubmitting}
                  >
                    <Text style={styles.submitText}>{isResetSubmitting ? "Updating…" : "Update Password"}</Text>
                    {!isResetSubmitting && <Ionicons name="chevron-forward" size={18} color="#fff" />}
                  </AppPressable>
                </>
              ) : null}
            </>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>EMAIL</Text>
                <View style={[styles.inputWrap, emailFocused && styles.inputWrapFocused]}>
                  <Ionicons name="mail-outline" size={18} color={colors.ink500} />
                  <TextInput
                    value={email}
                    onChangeText={(nextEmail) => {
                      setEmail(nextEmail);
                      setLoginNotice(null);
                    }}
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

              <View style={styles.fieldGroup}>
                <Text style={styles.fieldLabel}>PASSWORD</Text>
                <View style={[styles.inputWrap, pwFocused && styles.inputWrapFocused]}>
                  <Ionicons name="lock-closed-outline" size={18} color={colors.ink500} />
                  <TextInput
                    value={password}
                    onChangeText={(nextPassword) => {
                      setPassword(nextPassword);
                      setLoginNotice(null);
                    }}
                    secureTextEntry={!showPw}
                    placeholder="••••••••"
                    placeholderTextColor={colors.ink400}
                    style={styles.input}
                    onFocus={() => setPwFocused(true)}
                    onBlur={() => setPwFocused(false)}
                  />
                  <AppPressable onPress={() => setShowPw((v) => !v)} style={styles.eyeBtn}>
                    <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.ink500} />
                  </AppPressable>
                </View>
              </View>

              <View style={styles.forgotRow}>
                <AppPressable onPress={openPasswordReset} disabled={isBusy}>
                  <Text style={styles.footerLink}>Forgot password?</Text>
                </AppPressable>
              </View>

              <AppPressable
                style={[styles.submitBtn, isBusy && styles.submitBtnDisabled]}
                onPress={() => onSubmit({ email, password })}
                disabled={isBusy}
              >
                <Text style={styles.submitText}>{isSubmitting ? "Authorizing…" : "Sign In"}</Text>
                {!isSubmitting && <Ionicons name="chevron-forward" size={18} color="#fff" />}
              </AppPressable>

              <View style={styles.divider}>
                <View style={styles.divLine} />
                <Text style={styles.divText}>or continue with</Text>
                <View style={styles.divLine} />
              </View>

              <View style={styles.socialRow}>
                <AppPressable
                  style={[styles.socialButton, isBusy && styles.socialButtonDisabled]}
                  onPress={onGoogleSubmit}
                  disabled={isBusy}
                >
                  <Ionicons name="logo-google" size={18} color="#374151" />
                  <Text style={styles.socialText}>Google</Text>
                </AppPressable>
              </View>

              <View style={styles.footer}>
                <Text style={styles.footerText}>Don't have an account?{" "}</Text>
                <AppPressable onPress={onSwitchToRegister} disabled={isBusy}>
                  <Text style={styles.footerLink}>Create an account</Text>
                </AppPressable>
              </View>
            </>
          )}
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
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.successSoft,
  },
  successText: {
    flex: 1,
    color: colors.success,
    fontSize: 14,
    fontWeight: "500",
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
  resetHeader: {
    gap: 4,
  },
  resetTitle: {
    color: colors.ink900,
    fontSize: 24,
    fontWeight: "700",
  },
  resetSub: {
    color: colors.ink500,
    fontSize: 14,
    lineHeight: 20,
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
  forgotRow: {
    alignItems: "flex-end",
    marginTop: -4,
  },
  secondaryLinkButton: {
    alignSelf: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  secondaryLinkText: {
    color: colors.ink700,
    fontSize: 14,
    fontWeight: "500",
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
  socialRow: {
    flexDirection: "row",
  },
  socialButton: {
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
  socialButtonDisabled: {
    opacity: 0.7,
  },
  socialText: {
    color: "#374151",
    fontWeight: "600",
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
