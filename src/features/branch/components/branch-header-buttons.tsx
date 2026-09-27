import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { shadows } from "@/lib/theme";
import Animated, {
  Easing,
  useAnimatedStyle,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { SaveHeartButton } from "@/components/ui/save-heart-button";

import { heroCovered } from "../hero-shared";

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

type BranchHeaderButtonsProps = {
  isSaved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
};

// Floating back/save controls. Kept outside the ScrollView so they stay fixed
// while the hero image parallaxes behind them.
export function BranchHeaderButtons({
  isSaved,
  onBack,
  onToggleSave,
}: BranchHeaderButtonsProps) {
  const insets = useSafeAreaInsets();
  // While a card's photo flies in over the page these sit hidden, then fade in
  // as it lands instead of popping on top of it.
  const fade = useAnimatedStyle(() => ({
    opacity:
      heroCovered.get() === 1
        ? 0
        : withTiming(1, { duration: 180, easing: EASE_OUT }),
  }));

  return (
    <Animated.View
      className="absolute left-0 right-0 flex-row items-center justify-between px-4"
      pointerEvents="box-none"
      style={[{ top: insets.top + 8 }, fade]}
    >
      <IconButton
        accessibilityLabel="Go back"
        icon={ArrowLeft01Icon}
        iconSize={22}
        onPress={onBack}
        size={44}
        style={shadows.navigation}
      />

      <SaveHeartButton
        iconSize={20}
        isSaved={isSaved}
        onPress={onToggleSave}
        style={[{ height: 44, width: 44 }, shadows.navigation]}
      />
    </Animated.View>
  );
}
