import { cssInterop } from "nativewind";
import { forwardRef, useState, type ComponentProps } from "react";
import { Pressable, type View } from "react-native";
import Animated, { cubicBezier } from "react-native-reanimated";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
// Reanimated's CSS transitions take a cubicBezier() object, not a CSS string.
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
// Let `className` style the animated pressable like a normal Pressable.
cssInterop(AnimatedPressable, { className: "style" });

// Press feedback for anything tappable (animate-expo "Press feedback"): a 3%
// shrink on press-in over 120ms, strong ease-out, as a Reanimated CSS
// transition — no shared value, nothing per frame. Near-imperceptible on
// purpose; it's touched dozens of times a session. A drop-in for Pressable:
// same props, same className layout.
export const PressableScale = forwardRef<
  View,
  ComponentProps<typeof Pressable> & { className?: string; scaleTo?: number }
>(function PressableScale(
  {
    onPressIn,
    onPressOut,
    style,
    scaleTo = 0.97,
    pressRetentionOffset,
    ...props
  },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      pressRetentionOffset={pressRetentionOffset ?? 16}
      // Like iOS's delaysContentTouches: wait a beat before showing the press so
      // a touch that turns into a scroll never shrinks the card. A quick tap
      // still gets press-in → press-out, so taps keep their feedback.
      unstable_pressDelay={props.unstable_pressDelay ?? 90}
      ref={ref}
      style={[
        style as object,
        {
          transform: [{ scale: pressed && !props.disabled ? scaleTo : 1 }],
          transitionProperty: "transform",
          transitionDuration: 120,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    />
  );
});

// The same feedback for things that shouldn't change size (text links, icon
// buttons, list rows): dims to 60% on press-in, same timing and scroll-safe
// press delay as PressableScale.
export const PressableFade = forwardRef<
  View,
  ComponentProps<typeof Pressable> & { className?: string }
>(function PressableFade(
  { onPressIn, onPressOut, style, pressRetentionOffset, ...props },
  ref,
) {
  const [pressed, setPressed] = useState(false);
  return (
    <AnimatedPressable
      {...props}
      onPressIn={(e) => {
        setPressed(true);
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        setPressed(false);
        onPressOut?.(e);
      }}
      pressRetentionOffset={pressRetentionOffset ?? 16}
      unstable_pressDelay={props.unstable_pressDelay ?? 90}
      ref={ref}
      style={[
        style as object,
        {
          opacity: pressed && !props.disabled ? 0.6 : 1,
          transitionProperty: "opacity",
          transitionDuration: 120,
          transitionTimingFunction: EASE_OUT,
        },
      ]}
    />
  );
});
