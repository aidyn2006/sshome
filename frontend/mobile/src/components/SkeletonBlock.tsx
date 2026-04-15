import { useEffect, useRef } from "react";
import { Animated, StyleProp, ViewStyle } from "react-native";

import { colors } from "../theme/colors";

type Props = {
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ style }: Props) {
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 700,
          useNativeDriver: true
        }),
        Animated.timing(opacity, {
          toValue: 0.4,
          duration: 700,
          useNativeDriver: true
        })
      ])
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 14,
          opacity
        },
        style
      ]}
    />
  );
}
