import { StatusBar } from "expo-status-bar";
import { useMemo, useState } from "react";
import { Alert, SafeAreaView, StyleSheet } from "react-native";
import { LoginScreen } from "./src/screens/LoginScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import type { LoginPayload, RegisterPayload } from "./src/types/auth";

type AuthPage = "login" | "register";

export default function App() {
  const [page, setPage] = useState<AuthPage>("login");

  const title = useMemo(
    () => (page === "login" ? "SSHome Sign In" : "SSHome Register"),
    [page]
  );

  const onLogin = async (payload: LoginPayload) => {
    Alert.alert(
      "Login Request",
      `Email/Phone: ${payload.emailOrPhone}\nPassword length: ${payload.password.length}`
    );
  };

  const onRegister = async (payload: RegisterPayload) => {
    Alert.alert(
      "Register Request",
      `Name: ${payload.name}\nEmail: ${payload.email}\nPhone: ${payload.phone || "not set"}`
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      {page === "login" ? (
        <LoginScreen
          appTitle={title}
          onSwitchToRegister={() => setPage("register")}
          onSubmit={onLogin}
        />
      ) : (
        <RegisterScreen
          appTitle={title}
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
