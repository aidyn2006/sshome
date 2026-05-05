import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useState } from "react";

import { TabBar } from "../components/TabBar";
import { ActivityScreen } from "../screens/ActivityScreen";
import { AddLocationModalScreen } from "../screens/AddLocationModalScreen";
import { DevicesScreen } from "../screens/DevicesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
import { Room3DScreen } from "../screens/Room3DScreen";
import { ScenesScreen } from "../screens/ScenesScreen";
import { useSmartHome } from "../store/SmartHomeContext";
import { colors } from "../theme/colors";
import type { RootStackParamList, TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  dark: false,
  colors: {
    primary: colors.accentBlue,
    background: colors.background,
    card: colors.surface,
    text: colors.textPrimary,
    border: colors.border,
    notification: colors.activeGreen
  },
  fonts: {
    regular: {
      fontFamily: "System",
      fontWeight: "400"
    },
    medium: {
      fontFamily: "System",
      fontWeight: "500"
    },
    bold: {
      fontFamily: "System",
      fontWeight: "700"
    },
    heavy: {
      fontFamily: "System",
      fontWeight: "800"
    }
  }
};

function AuthGateway() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { authError, authStatus, isAuthSubmitting, login, register } = useSmartHome();

  if (authStatus === "loading") {
    return (
      <View style={styles.authLoading}>
        <ActivityIndicator size="large" color={colors.accentBlue} />
        <Text style={styles.authLoadingTitle}>Connecting to SSHome</Text>
        <Text style={styles.authLoadingText}>Checking your session and syncing data</Text>
      </View>
    );
  }

  if (mode === "register") {
    return (
      <RegisterScreen
        appTitle="SSHome IoT Control"
        isSubmitting={isAuthSubmitting}
        errorMessage={authError ?? undefined}
        onSwitchToLogin={() => setMode("login")}
        onSubmit={register}
      />
    );
  }

  return (
    <LoginScreen
      appTitle="SSHome IoT Control"
      isSubmitting={isAuthSubmitting}
      errorMessage={authError ?? undefined}
      onSwitchToRegister={() => setMode("register")}
      onSubmit={login}
    />
  );
}

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Room3D" component={Room3DScreen} options={{ title: "3D Room" }} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Scenes" component={ScenesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { authStatus } = useSmartHome();

  if (authStatus !== "authenticated") {
    return <AuthGateway />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: "slide_from_right"
        }}
      >
        <Stack.Screen name="Tabs" component={TabsNavigator} />
        <Stack.Screen
          name="AddLocationModal"
          component={AddLocationModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  authLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    gap: 12
  },
  authLoadingTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700"
  },
  authLoadingText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center"
  }
});
