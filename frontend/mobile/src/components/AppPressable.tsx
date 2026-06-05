import { forwardRef } from "react";
import {
  GestureResponderEvent,
  Platform,
  Pressable,
  PressableProps,
  StyleProp,
  View,
  ViewStyle
} from "react-native";

const isWeb = Platform.OS === "web";

/**
 * A drop-in replacement for React Native's `Pressable` that behaves correctly
 * on web (react-native-web) as well as on iOS/Android:
 *
 *  - Shows a pointer cursor on web (RN-web leaves it as the default arrow,
 *    which makes buttons feel broken/"crooked").
 *  - Stops the underlying DOM event from bubbling to ancestor Pressables, so
 *    tapping one control never triggers a wrapping or neighbouring one — the
 *    classic "pressing one button presses the others" bug on web.
 *
 * On native these wrappers are no-ops, so behaviour is unchanged.
 */
function withStopPropagation<E extends GestureResponderEvent>(
  handler?: (event: E) => void
): ((event: E) => void) | undefined {
  if (!handler) {
    return handler;
  }
  return (event: E) => {
    if (isWeb) {
      (event as unknown as { stopPropagation?: () => void })?.stopPropagation?.();
    }
    handler(event);
  };
}

export type AppPressableProps = PressableProps;

export const AppPressable = forwardRef<View, AppPressableProps>(function AppPressable(
  { onPress, onPressIn, onPressOut, style, disabled, ...rest },
  ref
) {
  // Web polish: pointer cursor, no text selection on tap, no focus outline —
  // the things that make RN-web buttons feel "off"/crooked by default.
  const cursorStyle: StyleProp<ViewStyle> = isWeb
    ? ({
        cursor: disabled ? "default" : "pointer",
        userSelect: "none",
        outlineStyle: "none"
      } as unknown as ViewStyle)
    : null;

  const mergedStyle: PressableProps["style"] =
    typeof style === "function"
      ? (state) => [cursorStyle, style(state)]
      : [cursorStyle, style];

  return (
    <Pressable
      ref={ref}
      disabled={disabled}
      onPress={withStopPropagation(onPress ?? undefined)}
      onPressIn={withStopPropagation(onPressIn ?? undefined)}
      onPressOut={withStopPropagation(onPressOut ?? undefined)}
      style={mergedStyle}
      {...rest}
    />
  );
});
