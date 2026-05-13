import { Ionicons } from "@expo/vector-icons";
import { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

type Props = {
  eyebrow?: string;
  title: string | ReactNode;
  subtitle?: string;
  right?: ReactNode;
  secure?: boolean;
  backendStatus?: "connected" | "checking" | "unavailable";
};

export function ScreenHeader({ eyebrow, title, subtitle, right, secure = true, backendStatus }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 14 }]}>
      {/* eyebrow row */}
      <View style={styles.eyebrowRow}>
        <View style={styles.eyebrowLeft}>
          {secure && (
            <>
              <Ionicons name="shield-checkmark" size={12} color={colors.success} />
              <Text style={styles.eyebrowSecure}>SECURE</Text>
              <Text style={styles.eyebrowDot}>·</Text>
            </>
          )}
          {eyebrow ? (
            <Text style={styles.eyebrowText}>{eyebrow}</Text>
          ) : null}
          {backendStatus != null && (
            <>
              {eyebrow && <Text style={styles.eyebrowDot}>·</Text>}
              <Text style={[
                styles.eyebrowText,
                backendStatus === "connected" && styles.eyebrowOnline,
                backendStatus === "unavailable" && styles.eyebrowOffline,
              ]}>
                {backendStatus === "connected" ? "ONLINE" : backendStatus === "checking" ? "CHECKING" : "OFFLINE"}
              </Text>
            </>
          )}
        </View>
        {right && <View style={styles.eyebrowRight}>{right}</View>}
      </View>

      {/* title */}
      <View style={styles.titleRow}>
        {typeof title === "string" ? (
          <Text style={styles.titleText}>{title}</Text>
        ) : (
          title
        )}
      </View>

      {subtitle ? (
        <Text style={styles.subtitle}>{subtitle}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  eyebrowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  eyebrowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eyebrowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eyebrowSecure: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink700,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  eyebrowDot: {
    color: colors.ink400,
    fontSize: 12,
  },
  eyebrowText: {
    fontFamily: "monospace",
    fontSize: 10.5,
    fontWeight: "500",
    color: colors.ink500,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  eyebrowOnline: {
    color: colors.success,
  },
  eyebrowOffline: {
    color: colors.warn,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
  },
  titleText: {
    fontSize: 32,
    fontWeight: "700",
    color: colors.ink900,
    letterSpacing: -0.8,
    lineHeight: 36,
  },
  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: colors.ink500,
    lineHeight: 20,
  },
});
