import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef } from "react";
import { Animated, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Scenario } from "../types/smartHome";

const iconColors = [
  "rgba(74,144,226,0.25)",
  "rgba(124,92,191,0.25)",
  "rgba(245,166,35,0.25)",
  "rgba(40,198,200,0.25)",
  "rgba(46,204,113,0.25)"
] as const;

const sceneIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Leave Home": "moon-outline",
  "Good Morning": "sunny-outline",
  "Movie Mode": "film-outline",
  "Night Mode": "bed-outline"
};

type Props = {
  scene: Scenario;
  colorIndex: number;
  onRun: () => void;
};

export function SceneCard({ scene, colorIndex, onRun }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;
  const flash = useRef(new Animated.Value(0)).current;

  const borderColor = flash.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.border, colors.activeGreen]
  });

  const run = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    Animated.sequence([
      Animated.timing(pulse, {
        toValue: 0.9,
        duration: 120,
        useNativeDriver: true
      }),
      Animated.spring(pulse, {
        toValue: 1,
        useNativeDriver: true,
        speed: 14,
        bounciness: 12
      })
    ]).start();

    Animated.sequence([
      Animated.timing(flash, {
        toValue: 1,
        duration: 200,
        useNativeDriver: false
      }),
      Animated.delay(700),
      Animated.timing(flash, {
        toValue: 0,
        duration: 180,
        useNativeDriver: false
      })
    ]).start();

    onRun();
  };

  return (
    <Animated.View style={[styles.card, { borderColor, transform: [{ scale: pulse }] }]}>
      <View style={[styles.iconBox, { backgroundColor: iconColors[colorIndex % iconColors.length] }]}>
        <Ionicons
          name={sceneIcons[scene.name] ?? "flash-outline"}
          size={24}
          color={colors.textPrimary}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{scene.name}</Text>
        <Text numberOfLines={1} style={styles.description}>
          {scene.description}
        </Text>
        <Text style={styles.actionsTag}>{scene.actions.length} actions</Text>
      </View>

      <Pressable onPress={run} style={styles.runButton}>
        <Ionicons name="play" size={16} color={colors.textPrimary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 100,
    borderRadius: 20,
    backgroundColor: colors.card,
    borderWidth: 1,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  content: {
    flex: 1,
    gap: 4
  },
  name: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "700"
  },
  description: {
    color: colors.textSecondary,
    fontSize: 13
  },
  actionsTag: {
    color: colors.textSecondary,
    fontSize: 12
  },
  runButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accentBlue,
    alignItems: "center",
    justifyContent: "center"
  }
});
