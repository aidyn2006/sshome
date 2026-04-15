import { useEffect, useRef } from "react";
import { Animated, StyleSheet, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors } from "../theme/colors";

type Props = {
  visible: boolean;
  message: string;
  onHidden: () => void;
};

export function ToastNotification({ visible, message, onHidden }: Props) {
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(-120)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

    Animated.sequence([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 260,
        useNativeDriver: true
      }),
      Animated.delay(1200),
      Animated.timing(translateY, {
        toValue: -120,
        duration: 260,
        useNativeDriver: true
      })
    ]).start(() => {
      onHidden();
    });
  }, [visible, translateY, onHidden]);

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.container,
        {
          top: insets.top + 10,
          transform: [{ translateY }]
        }
      ]}
    >
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 99,
    backgroundColor: colors.activeGreen,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: "center"
  },
  text: {
    color: colors.textOnAccent,
    fontWeight: "700",
    fontSize: 14
  }
});
