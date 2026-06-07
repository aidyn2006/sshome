import { Ionicons } from "@expo/vector-icons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { StyleSheet, Text, View } from "react-native";
import { AppPressable } from "./AppPressable";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

const iconMap: Record<string, { active: keyof typeof Ionicons.glyphMap; inactive: keyof typeof Ionicons.glyphMap }> = {
  Home:     { active: "home",        inactive: "home-outline" },
  Room3D:   { active: "cube",        inactive: "cube-outline" },
  Devices:  { active: "grid",        inactive: "grid-outline" },
  Assistant:{ active: "chatbubble-ellipses", inactive: "chatbubble-ellipses-outline" },
  Scenes:   { active: "flash",       inactive: "flash-outline" },
  Activity: { active: "pulse",       inactive: "pulse-outline" },
  Admin:    { active: "shield-checkmark", inactive: "shield-checkmark-outline" },
  AttackSim:{ active: "bug",         inactive: "bug-outline" },
};

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.wrapper, { paddingBottom: Math.max(insets.bottom, 8) }]}>
      <View style={styles.pill}>
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

          const displayLabel = route.name === "Room3D" ? "Room" : label;

          return (
            <AppPressable
              key={route.key}
              onPress={() => navigation.navigate(route.name)}
              style={styles.tabButton}
            >
              <View style={[
                styles.iconWrap,
                isFocused && styles.iconWrapActive,
              ]}>
                <Ionicons
                  name={isFocused ? iconSet.active : iconSet.inactive}
                  size={20}
                  color={isFocused ? colors.accent : colors.ink500}
                />
              </View>
              <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]}>{displayLabel}</Text>
            </AppPressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  pill: {
    flexDirection: "row",
    backgroundColor: "rgba(250, 251, 252, 0.94)",
    borderRadius: 28,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderWidth: 0.5,
    borderColor: colors.hairline,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 12,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingVertical: 6,
  },
  iconWrap: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 9,
  },
  iconWrapActive: {
    backgroundColor: colors.accentTint,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: colors.ink500,
    letterSpacing: 0.3,
  },
  tabLabelActive: {
    color: colors.accent,
  },
});
