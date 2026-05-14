import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  value: string;
  subtitle: string;
  accent?: string;
  trend?: number;
};

export function StatCard({ icon, title, value, subtitle, accent = colors.accent, trend }: Props) {
  const trendUp = trend != null && trend > 0;
  const trendIcon: keyof typeof Ionicons.glyphMap = trendUp ? "trending-up" : "trending-down";

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={[styles.iconBox, { backgroundColor: `${accent}18` }]}>
          <Ionicons name={icon} size={14} color={accent} />
        </View>
        {trend != null && (
          <View style={styles.trendBadge}>
            <Ionicons
              name={trendIcon}
              size={11}
              color={trendUp ? colors.success : colors.ink500}
            />
            <Text style={[styles.trendText, trendUp && styles.trendUp]}>
              {Math.abs(trend)}
            </Text>
          </View>
        )}
      </View>
      <View>
        <View style={styles.valueRow}>
          <Text style={styles.value}>{value}</Text>
        </View>
        <Text style={styles.label}>{subtitle || title}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    gap: 10,
    minHeight: 96,
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  trendBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  trendText: {
    fontFamily: "monospace",
    fontSize: 10.5,
    color: colors.ink500,
  },
  trendUp: {
    color: colors.success,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  value: {
    fontFamily: "monospace",
    fontSize: 22,
    color: colors.ink900,
    fontWeight: "500",
    letterSpacing: -0.5,
  },
  label: {
    fontSize: 11.5,
    color: colors.ink500,
    marginTop: 2,
  },
});
