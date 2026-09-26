import { FavouriteIcon } from "@hugeicons/core-free-icons";
import type { StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { AppIcon } from "@/components/ui/huge-icon";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";

// The one save/unsave heart. Saving pops the heart and fills it; unsaving gives
// a small dip. The animation is driven by the tap (not by `isSaved` changing) so
// hearts never bounce when a list loads or recycles rows. Reanimated honours the
// system Reduce Motion setting by default.
export function SaveHeartButton({
  isSaved,
  onPress,
  iconSize = 24,
  className = "",
  style,
}: {
  isSaved: boolean;
  onPress: () => void;
  iconSize?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  function handlePress() {
    haptics.tap();
    scale.set(
      isSaved
        ? withSequence(
            withTiming(0.85, { duration: 90 }),
            withTiming(1, { duration: 120 }),
          )
        : withSequence(
            withTiming(0.8, { duration: 80 }),
            withSpring(1, { damping: 7, stiffness: 320, mass: 0.6 }),
          ),
    );
    onPress();
  }

  return (
    <Pressable
      accessibilityLabel={isSaved ? "Remove from saved" : "Save place"}
      accessibilityRole="button"
      accessibilityState={{ selected: isSaved }}
      className={`items-center justify-center rounded-full bg-surface ${className}`}
      hitSlop={8}
      onPress={handlePress}
      style={style}
    >
      <Animated.View style={animatedStyle}>
        <AppIcon
          color={isSaved ? colors.favorite : colors.foreground}
          fill={isSaved ? colors.favorite : "none"}
          icon={FavouriteIcon}
          size={iconSize}
        />
      </Animated.View>
    </Pressable>
  );
}
