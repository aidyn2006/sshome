import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";
import { login, register } from "./src/api/auth";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import type { LoginPayload, RegisterPayload } from "./src/types/auth";

type AuthPage = "login" | "register";

export default function App() {
  const [page, setPage] = useState<AuthPage>("login");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const title = useMemo(
    () => (page === "login" ? "SSHome Sign In" : "SSHome Register"),
    [page]
  );

  const onLogin = async (payload: LoginPayload) => {
    if (!payload.email || !payload.password) {
      Alert.alert("Validation", "Email and password are required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokens = await login(payload);
      Alert.alert(
        "Success",
        `Logged in.\nToken type: ${tokens.token_type}\nAccess: ${tokens.access_token.slice(0, 18)}...`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Login failed.";
      Alert.alert("Login failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onRegister = async (payload: RegisterPayload) => {
    if (payload.password !== payload.confirmPassword) {
      Alert.alert("Validation", "Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await register(payload);
      Alert.alert("Success", `User ${user.email} created successfully.`);
      setPage("login");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Registration failed.";
      Alert.alert("Registration failed", message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {page === "login" ? (
        <LoginScreen
          appTitle={title}
          isSubmitting={isSubmitting}
          onSwitchToRegister={() => setPage("register")}
          onSubmit={onLogin}
        />
      ) : (
        <RegisterScreen
          appTitle={title}
          isSubmitting={isSubmitting}
          onSwitchToLogin={() => setPage("login")}
          onSubmit={onRegister}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f3f6fb"
  }
});
