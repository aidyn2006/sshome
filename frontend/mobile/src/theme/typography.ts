import { StyleSheet } from "react-native";

import { colors } from "./colors";

export const typography = StyleSheet.create({
  h1: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.textPrimary
  },
  h2: {
    fontSize: 20,
    fontWeight: "600",
    color: colors.textPrimary
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.textPrimary
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.textSecondary
  }
});
