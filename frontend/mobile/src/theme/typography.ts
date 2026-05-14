import { StyleSheet } from "react-native";

import { colors } from "./colors";

export const typography = StyleSheet.create({
  h1: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  h2: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.4,
  },
  h3: {
    fontSize: 17,
    fontWeight: "600",
    color: colors.ink900,
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 15,
    fontWeight: "400",
    color: colors.ink900,
    lineHeight: 22,
  },
  bodyMedium: {
    fontSize: 15,
    fontWeight: "500",
    color: colors.ink900,
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
    color: colors.ink500,
    lineHeight: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase" as const,
  },
  mono: {
    fontFamily: "monospace",
    fontSize: 12,
    color: colors.ink500,
    letterSpacing: 0.2,
  },
  monoLg: {
    fontFamily: "monospace",
    fontSize: 18,
    fontWeight: "500",
    color: colors.ink900,
    letterSpacing: -0.5,
  },
});
