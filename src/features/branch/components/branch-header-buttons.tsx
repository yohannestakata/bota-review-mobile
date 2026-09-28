import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { shadows } from "@/lib/theme";
import Animated, { useAnimatedStyle } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { SaveHeartButton } from "@/components/ui/save-heart-button";

import { heroCovered } from "../hero-shared";

type BranchHeaderButtonsProps = {
  isSaved: boolean;
  onBack: () => void;
  onToggleSave: () => void;
  /** A non-interactive copy, drawn by the card-photo flight as it lands. */
  preview?: boolean;
};

// Floating back/save controls. Kept outside the ScrollView so they stay fixed
// while the hero image parallaxes behind them.
export function BranchHeaderButtons({
  isSaved,
  onBack,
  onToggleSave,
  preview = false,
}: BranchHeaderButtonsProps) {
  const insets = useSafeAreaInsets();
  // While a card's photo flies in over the page these sit hidden under it;
  // the flight fades in a preview copy on top, and these take over on the
  // landing frame.
  const fade = useAnimatedStyle(() => ({
    opacity: preview || heroCovered.get() === 0 ? 1 : 0,
  }));

  return (
    <Animated.View
      className="absolute left-0 right-0 flex-row items-center justify-between px-4"
      pointerEvents={preview ? "none" : "box-none"}
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
