import { LinearGradient } from "expo-linear-gradient";
import { StyleSheet, Text, View } from "react-native";

import { colors, gradients } from "../theme/colors";

type Props = {
  emoji: string;
  name: string;
  deviceCount: number;
  isActive: boolean;
};

export function RoomCard({ emoji, name, deviceCount, isActive }: Props) {
  return (
    <LinearGradient colors={gradients.roomCard} style={styles.card}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.name}>{name}</Text>
      <View style={styles.bottomRow}>
        <Text style={styles.count}>{deviceCount} devices</Text>
        <View style={[styles.dot, isActive && styles.dotActive]} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 140,
    height: 160,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "space-between"
  },
  emoji: {
    fontSize: 36
  },
  name: {
    color: colors.textPrimary,
    fontWeight: "700",
    fontSize: 16
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between"
  },
  count: {
    color: colors.textSecondary,
    fontSize: 12
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.inactiveGray
  },
  dotActive: {
    backgroundColor: colors.activeGreen
  }
});
