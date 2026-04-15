import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type { LoginPayload } from "../types/auth";

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
  onSubmit
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={styles.keyboardWrap}
    >
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.glow} />
          <ImageBackground
            source={{
              uri: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?auto=format&fit=crop&w=1200&q=80"
            }}
            resizeMode="cover"
            style={styles.banner}
            imageStyle={styles.bannerImage}
          >
            <View style={styles.bannerMask} />
          </ImageBackground>

          <View style={styles.content}>
            <Text style={styles.appLabel}>{appTitle}</Text>
            <View style={styles.logoCircle}>
              <Ionicons name="shield-checkmark" size={30} color="#3b82f6" />
            </View>
            <Text style={styles.title}>Welcome Back</Text>
            <Text style={styles.subtitle}>Sign in to continue to your account</Text>
            {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
                placeholderTextColor="#9ca3af"
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <View style={styles.rowBetween}>
                <Text style={styles.label}>Password</Text>
                <Pressable>
                  <Text style={styles.forgotLink}>Forgot password?</Text>
                </Pressable>
              </View>
              <View style={styles.passwordWrap}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!isPasswordVisible}
                  placeholder="********"
                  placeholderTextColor="#9ca3af"
                  style={styles.passwordInput}
                />
                <Pressable
                  style={styles.showButton}
                  onPress={() => setIsPasswordVisible((prev) => !prev)}
                >
                  <Text style={styles.showButtonText}>{isPasswordVisible ? "Hide" : "Show"}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.submit, isSubmitting && styles.submitDisabled]}
              onPress={() => onSubmit({ email, password })}
              disabled={isSubmitting}
            >
              <Text style={styles.submitText}>{isSubmitting ? "Signing In..." : "Sign In"}</Text>
            </Pressable>

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            <View style={styles.socialRow}>
              <Pressable style={styles.socialButton}>
                <Ionicons name="logo-google" size={18} color="#374151" />
                <Text style={styles.socialText}>Google</Text>
              </Pressable>
              <Pressable style={styles.socialButton}>
                <Ionicons name="logo-github" size={18} color="#111827" />
                <Text style={styles.socialText}>GitHub</Text>
              </Pressable>
            </View>

            <View style={styles.footerRow}>
              <Text style={styles.footerText}>Don&apos;t have an account?</Text>
              <Pressable onPress={onSwitchToRegister}>
                <Text style={styles.footerLink}>Sign up</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardWrap: {
    flex: 1
  },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 16
  },
  card: {
    borderRadius: 24,
    backgroundColor: "#ffffff",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#0f172a",
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 14 },
    shadowRadius: 22,
    elevation: 8
  },
  glow: {
    position: "absolute",
    top: -28,
    left: 20,
    right: 20,
    height: 120,
    borderRadius: 999,
    backgroundColor: "rgba(96,165,250,0.22)",
    zIndex: 0
  },
  banner: {
    height: 86,
    justifyContent: "flex-end"
  },
  bannerImage: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24
  },
  bannerMask: {
    height: 56,
    backgroundColor: "rgba(255,255,255,0.68)"
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 22
  },
  appLabel: {
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 12,
    marginBottom: 8
  },
  logoCircle: {
    alignSelf: "center",
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    shadowColor: "#93c5fd",
    shadowOpacity: 0.4,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 14,
    elevation: 5
  },
  title: {
    textAlign: "center",
    fontSize: 26,
    fontWeight: "700",
    color: "#111827"
  },
  subtitle: {
    marginTop: 6,
    textAlign: "center",
    color: "#6b7280",
    marginBottom: 20
  },
  errorText: {
    marginTop: -4,
    marginBottom: 16,
    color: "#dc2626",
    textAlign: "center",
    fontWeight: "600"
  },
  field: {
    marginBottom: 12
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6
  },
  label: {
    color: "#374151",
    fontWeight: "600"
  },
  forgotLink: {
    color: "#2563eb",
    fontSize: 12,
    fontWeight: "600"
  },
  input: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    height: 48,
    paddingHorizontal: 12,
    color: "#111827"
  },
  passwordWrap: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    height: 48,
    flexDirection: "row",
    alignItems: "center"
  },
  passwordInput: {
    flex: 1,
    height: "100%",
    paddingHorizontal: 12,
    color: "#111827"
  },
  showButton: {
    paddingHorizontal: 12,
    height: "100%",
    justifyContent: "center"
  },
  showButtonText: {
    color: "#2563eb",
    fontSize: 13,
    fontWeight: "600"
  },
  submit: {
    marginTop: 4,
    backgroundColor: "#2563eb",
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  submitDisabled: {
    opacity: 0.7
  },
  submitText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 15
  },
  dividerRow: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center"
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#e5e7eb"
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: "#9ca3af"
  },
  socialRow: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10
  },
  socialButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8
  },
  socialText: {
    color: "#374151",
    fontWeight: "600"
  },
  footerRow: {
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6
  },
  footerText: {
    color: "#6b7280"
  },
  footerLink: {
    color: "#2563eb",
    fontWeight: "700"
  }
});
