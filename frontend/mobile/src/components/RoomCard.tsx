import { StyleSheet, Text, View } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  emoji: string;
  name: string;
  deviceCount: number;
  isActive: boolean;
  activeCount?: number;
};

export function RoomCard({ emoji, name, deviceCount, isActive, activeCount = 0 }: Props) {
  const countLabel = `${activeCount}/${deviceCount}`;

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconBox}>
          <Text style={styles.emoji}>{emoji}</Text>
        </View>
        <View style={[styles.countBadge, activeCount > 0 && styles.countBadgeActive]}>
          <Text style={[styles.countText, activeCount > 0 && styles.countTextActive]}>
            {countLabel}
          </Text>
        </View>
      </View>
      <View>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.sub}>
          {activeCount === 0 ? "All quiet" : `${activeCount} device${activeCount === 1 ? "" : "s"} active`}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
    minHeight: 124,
    justifyContent: "space-between",
    shadowColor: colors.ink900,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 1,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  iconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.ink100,
    alignItems: "center",
    justifyContent: "center",
  },
  emoji: {
    fontSize: 18,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.ink100,
  },
  countBadgeActive: {
    backgroundColor: colors.accentTint,
  },
  countText: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink400,
    fontWeight: "500",
  },
  countTextActive: {
    color: colors.accent,
  },
  name: {
    fontSize: 18,
    fontWeight: "600",
    color: colors.ink900,
    letterSpacing: -0.3,
    lineHeight: 22,
  },
  sub: {
    fontSize: 11.5,
    color: colors.ink500,
    marginTop: 4,
  },
});
