import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home: { active: "home", inactive: "home-outline" },
  Devices: { active: "bulb", inactive: "bulb-outline" },
  Scenes: { active: "flash", inactive: "flash-outline" },
  Activity: { active: "stats-chart", inactive: "stats-chart-outline" }
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10), height: 80 + insets.bottom }]}> 
      {state.routes.map((route, index) => {
        const isFocused = state.index === index;
        const descriptor = descriptors[route.key];
        const options = descriptor.options;
        const iconSet = iconMap[route.name] ?? iconMap.Home;

        const label =
          typeof options.tabBarLabel === "string"
            ? options.tabBarLabel
            : typeof options.title === "string"
              ? options.title
              : route.name;

        return (
          <Pressable
            key={route.key}
            onPress={() => navigation.navigate(route.name)}
            style={styles.tabButton}
          >
            <Ionicons
              name={isFocused ? iconSet.active : iconSet.inactive}
              size={22}
              color={isFocused ? colors.accentBlue : colors.textSecondary}
            />
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingHorizontal: 12
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4
  },
  tabLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500"
  },
  tabLabelActive: {
    color: colors.accentBlue,
    fontWeight: "700"
  }
});
