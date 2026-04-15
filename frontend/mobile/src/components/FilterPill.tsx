import { Pressable, StyleSheet, Text } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

export function FilterPill({ label, isActive, onPress }: Props) {
  return (
    <Pressable onPress={onPress} style={[styles.pill, isActive && styles.pillActive]}>
      <Text style={[styles.text, isActive && styles.textActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    borderRadius: 50,
    backgroundColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  pillActive: {
    backgroundColor: colors.accentBlue
  },
  text: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500"
  },
  textActive: {
    color: colors.textPrimary,
    fontWeight: "700"
  }
});
