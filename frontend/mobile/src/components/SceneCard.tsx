import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useRef, useState } from "react";
import { Animated, ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";
import type { Scenario } from "../types/smartHome";

const sceneIcons: Record<string, keyof typeof Ionicons.glyphMap> = {
  "Leave Home":    "moon-outline",
  "Good Morning":  "sunny-outline",
  "Movie Mode":    "film-outline",
  "Night Mode":    "bed-outline",
  "Away Mode":     "shield-outline",
  "Focus":         "locate-outline",
  "Welcome Home":  "home-outline",
  "Movie Night":   "film-outline",
  "Goodnight":     "moon-outline",
};

const accentColors = ["#E8A26C", "#7A5AE0", "#1F8A5B", "#2A6FDB", "#C8674A", "#B45309"];

type Props = {
  scene: Scenario;
  colorIndex: number;
  onRun: () => void;
  editMode?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
};

export function SceneCard({ scene, colorIndex, onRun, editMode = false, onEdit, onDelete }: Props) {
  const [running, setRunning] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  const accent = accentColors[colorIndex % accentColors.length];

  const run = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.97, duration: 100, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 16, bounciness: 8 }),
    ]).start();
    setRunning(true);
    onRun();
    setTimeout(() => setRunning(false), 1400);
  };

  return (
    <Animated.View style={[styles.card, { transform: [{ scale }] }]}>
      <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
        <Ionicons
          name={sceneIcons[scene.name] ?? "flash-outline"}
          size={22}
          color={accent}
        />
      </View>

      <View style={styles.content}>
        <Text style={styles.name}>{scene.name}</Text>
        <Text numberOfLines={1} style={styles.description}>{scene.description}</Text>
        <Text style={styles.actions}>{scene.actions.length} ACTIONS</Text>
      </View>

      {editMode ? (
        <View style={styles.editActions}>
          <Pressable onPress={onEdit} style={styles.editBtn}>
            <Ionicons name="pencil-outline" size={15} color={colors.ink700} />
          </Pressable>
          <Pressable onPress={onDelete} style={[styles.editBtn, styles.deleteBtn]}>
            <Ionicons name="trash-outline" size={15} color="#c53030" />
          </Pressable>
        </View>
      ) : (
        <Pressable onPress={run} style={[styles.runBtn, running && { backgroundColor: accent }]}>
          {running ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="play" size={14} color="#fff" />
          )}
        </Pressable>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  content: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  name: {
    color: colors.ink900,
    fontSize: 15.5,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  description: {
    color: colors.ink500,
    fontSize: 12.5,
    marginTop: 1,
  },
  actions: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink500,
    marginTop: 4,
    letterSpacing: 0.5,
  },
  runBtn: {
    width: 40,
    height: 40,
    borderRadius: 999,
    backgroundColor: colors.ink900,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  editActions: {
    flexDirection: "row",
    gap: 8,
    flexShrink: 0,
  },
  editBtn: {
    width: 38,
    height: 38,
    borderRadius: 999,
    backgroundColor: colors.cream100,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "#fff1f1",
    borderColor: "#f5c6c6",
  },
});
