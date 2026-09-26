import { useAuth } from "@clerk/clerk-expo";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { AppIcon } from "@/components/ui/huge-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);

// The one save/unsave heart (animate-expo: toggle, tens of times a day, so
// near-imperceptible). Press-in gets the shared 0.97 press feedback. Saving
// adds a small swell (1 → 1.15 → 1, ~200ms, ease-out, no spring — a tap isn't
// thrown, so nothing overshoots) with the haptic on the same frame; unsaving
// is just the colour change. Driven by the tap, not by `isSaved` changing, so
// hearts never animate when a list loads. Reduce Motion drops the swell.
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
  const colors = useColors();
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();
  const { isSignedIn } = useAuth();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.get() }],
  }));

  function handlePress() {
    // Signed out, the tap only leads to sign-in — no "saved" feedback.
    if (!isSignedIn) {
      onPress();
      return;
    }
    haptics.tap();
    if (!isSaved && !reduced) {
      scale.set(
        withSequence(
          withTiming(1.15, { duration: 90, easing: EASE_OUT }),
          withTiming(1, { duration: 110, easing: EASE_IN_OUT }),
        ),
      );
    }
    onPress();
  }

  return (
    <PressableScale
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
    </PressableScale>
  );
}
