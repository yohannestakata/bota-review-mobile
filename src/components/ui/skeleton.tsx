import { useEffect } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolateColor,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { useColors } from "@/lib/theme";

type SkeletonProps = {
  className: string;
  style?: StyleProp<ViewStyle>;
};

const PULSE_DURATION_MS = 900;

export function Skeleton({ className, style }: SkeletonProps) {
  const colors = useColors();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, {
        duration: PULSE_DURATION_MS,
        easing: Easing.inOut(Easing.quad),
        reduceMotion: ReduceMotion.System,
      }),
      -1,
      true,
      undefined,
      ReduceMotion.System,
    );

    return () => cancelAnimation(progress);
  }, [progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.surfaceMuted, colors.placeholder],
    ),
  }));

  return (
    <Animated.View
      accessibilityElementsHidden
      className={className}
      importantForAccessibility="no-hide-descendants"
      style={[style, animatedStyle]}
    />
  );
}

// Line heights from global.css (--line-height-*), so a placeholder line takes
// exactly the vertical space of the ThemedText it stands in for.
const LINE_HEIGHT = {
  xs: 16,
  sm: 19,
  md: 24,
  lg: 22,
  xl: 26,
  "2xl": 28,
  "3xl": 34,
} as const;

/**
 * A placeholder for one line of ThemedText at `size`: a rounded bar inside a
 * box of that size's line height, so swapping in the real text doesn't shift
 * the layout. `className` sets the bar's width (e.g. "w-1/2").
 */
export function SkeletonText({
  size = "md",
  className = "w-2/3",
}: {
  size?: keyof typeof LINE_HEIGHT;
  className?: string;
}) {
  const height = LINE_HEIGHT[size];
  return (
    <View style={{ height, justifyContent: "center" }}>
      <Skeleton
        className={`rounded-full ${className}`}
        style={{ height: Math.round(height * 0.7) }}
      />
    </View>
  );
}

// Varied widths so a row of placeholder chips reads as words, not a grid.
const CHIP_WIDTHS = [88, 112, 72, 128, 96, 80, 120, 104, 76, 116];

/** Placeholder for a wrapping row of chips of the given height. */
export function SkeletonChips({
  count = 6,
  height = 42,
  gap = 8,
}: {
  count?: number;
  height?: number;
  gap?: number;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap }}>
      {Array.from({ length: count }, (_, i) => (
        <Skeleton
          className="rounded-full"
          key={i}
          style={{ height, width: CHIP_WIDTHS[i % CHIP_WIDTHS.length] }}
        />
      ))}
    </View>
  );
}
