import { StyleSheet, Text } from "react-native";
import { AppPressable } from "./AppPressable";

import { colors } from "../theme/colors";

type Props = {
  label: string;
  isActive: boolean;
  onPress: () => void;
  count?: number;
};

export function FilterPill({ label, isActive, onPress, count }: Props) {
  return (
    <AppPressable onPress={onPress} style={[styles.pill, isActive && styles.pillActive]}>
      <Text style={[styles.text, isActive && styles.textActive]}>{label}</Text>
      {count !== undefined && (
        <Text style={[styles.count, isActive && styles.countActive]}>{count}</Text>
      )}
    </AppPressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    height: 36,
    borderRadius: 999,
    paddingHorizontal: 14,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.hairlineStrong,
  },
  pillActive: {
    backgroundColor: colors.ink900,
    borderColor: colors.ink900,
  },
  text: {
    fontSize: 13.5,
    color: colors.ink700,
    fontWeight: "500",
  },
  textActive: {
    color: colors.cream50,
  },
  count: {
    fontFamily: "monospace",
    fontSize: 11,
    color: colors.ink500,
  },
  countActive: {
    color: "rgba(255,255,255,0.6)",
  },
});
