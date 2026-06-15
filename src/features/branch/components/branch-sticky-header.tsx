import { View } from "react-native";
import { colors } from "@/lib/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ui/themed-text";

import { HERO_HEIGHT } from "./branch-hero";

type BranchStickyHeaderProps = {
  title: string;
  scrollY: SharedValue<number>;
};

// A solid title bar that fades in as the hero scrolls out of view. Purely
// decorative (pointerEvents none) — the floating back/save buttons sit on top.
export function BranchStickyHeader({ title, scrollY }: BranchStickyHeaderProps) {
  const insets = useSafeAreaInsets();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      scrollY.value,
      [HERO_HEIGHT - 120, HERO_HEIGHT - 56],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          // Match the floating buttons: they sit at insets.top + 8 and are 44px
          // tall, so this row shares the same band and the title lines up with them.
          paddingTop: insets.top + 8,
          paddingBottom: 12,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
        },
        animatedStyle,
      ]}
    >
      <View className="items-center justify-center px-16" style={{ height: 44 }}>
        <ThemedText numberOfLines={1} size="lg" weight="semibold">
          {title}
        </ThemedText>
      </View>
    </Animated.View>
  );
}
