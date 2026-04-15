import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
};

export function StatCard({ icon, title, value, subtitle }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconCircle}>
          <Ionicons name={icon} size={16} color={colors.accentBlue} />
        </View>
        <Text style={styles.title}>{title}</Text>
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 180,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 8
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  iconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(74,144,226,0.18)"
  },
  title: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: "500"
  },
  value: {
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 12
  }
});
