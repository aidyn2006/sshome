import { NavigationContainer, type Theme } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { TabBar } from "../components/TabBar";
import { ActivityScreen } from "../screens/ActivityScreen";
import { AddLocationModalScreen } from "../screens/AddLocationModalScreen";
import { DevicesScreen } from "../screens/DevicesScreen";
import { HomeScreen } from "../screens/HomeScreen";
import { ScenesScreen } from "../screens/ScenesScreen";
import { colors } from "../theme/colors";
import type { RootStackParamList, TabParamList } from "./types";

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const navTheme: Theme = {
  dark: true,
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

function TabsNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false
      }}
      tabBar={(props) => <TabBar {...props} />}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Devices" component={DevicesScreen} />
      <Tab.Screen name="Scenes" component={ScenesScreen} />
      <Tab.Screen name="Activity" component={ActivityScreen} />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
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
