import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { ActivityIndicator, Platform, StyleSheet, Text, View } from "react-native";
import { useEffect, useState } from "react";

import { TabBar } from "../components/TabBar";
import { ActivityScreen } from "../screens/ActivityScreen";
import { AddDeviceModalScreen } from "../screens/AddDeviceModalScreen";
import { AddScenarioModalScreen } from "../screens/AddScenarioModalScreen";
import { AdminScreen } from "../screens/AdminScreen";
import { AddLocationModalScreen } from "../screens/AddLocationModalScreen";
import { AllRoomsModalScreen } from "../screens/AllRoomsModalScreen";
import { ChangePasswordModalScreen } from "../screens/ChangePasswordModalScreen";
import { DevicesScreen } from "../screens/DevicesScreen";
import { EditDeviceModalScreen } from "../screens/EditDeviceModalScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { LoginScreen } from "../screens/LoginScreen";
import { ManageFavoritesModalScreen } from "../screens/ManageFavoritesModalScreen";
import { RegisterScreen } from "../screens/RegisterScreen";
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
  const { authError, authStatus, isAuthSubmitting, login, loginWithGoogle, register } = useSmartHome();

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
      onGoogleSubmit={loginWithGoogle}
      onSubmit={login}
    />
  );
}

function TabsNavigator() {
  const { isAdmin } = useSmartHome();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      {/* 3D-комната доступна только в веб-версии (ноутбук); на телефоне таб скрыт */}
      {Platform.OS === "web" && (
        <Tab.Screen name="Room3D" component={Room3DRoute} options={{ title: "Room" }} />
      )}
      <Tab.Screen name="Scenes" component={ScenesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
      {isAdmin && <Tab.Screen name="Admin" component={AdminScreen} options={{ title: "Admin" }} />}
    </Tab.Navigator>
  );
}

function Room3DRoute() {
  const [Room3DScreen, setRoom3DScreen] = useState<React.ComponentType | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void import("../screens/Room3DScreen")
      .then((module) => {
        if (!cancelled) {
          setRoom3DScreen(() => module.Room3DScreen);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load 3D room view");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (loadError) {
    return (
      <View style={styles.room3DFallback}>
        <Text style={styles.room3DFallbackTitle}>3D room view unavailable</Text>
        <Text style={styles.room3DFallbackText}>
          Expo Go on this device does not provide the native `ExpoGL` module. Open this screen in a custom dev
          client or a build that includes the GL runtime.
        </Text>
      </View>
    );
  }

  if (!Room3DScreen) {
    return (
      <View style={styles.room3DFallback}>
        <ActivityIndicator color={colors.accentBlue} />
        <Text style={styles.room3DFallbackText}>Loading 3D room view...</Text>
      </View>
    );
  }

  return <Room3DScreen />;
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
        <Stack.Screen
          name="AddDeviceModal"
          component={AddDeviceModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
        <Stack.Screen
          name="EditDeviceModal"
          component={EditDeviceModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
        <Stack.Screen
          name="AddScenarioModal"
          component={AddScenarioModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
        <Stack.Screen
          name="AllRoomsModal"
          component={AllRoomsModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
        <Stack.Screen
          name="ManageFavoritesModal"
          component={ManageFavoritesModalScreen}
          options={{
            presentation: "modal",
            animation: "slide_from_bottom"
          }}
        />
        <Stack.Screen
          name="ChangePasswordModal"
          component={ChangePasswordModalScreen}
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
  },
  room3DFallback: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
    paddingHorizontal: 24,
    gap: 10
  },
  room3DFallbackTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center"
  },
  room3DFallbackText: {
    color: colors.textSecondary,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20
  }
});
