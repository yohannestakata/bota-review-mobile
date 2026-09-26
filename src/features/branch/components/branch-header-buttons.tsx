import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { shadows } from "@/lib/theme";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { SaveHeartButton } from "@/components/ui/save-heart-button";

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

  return (
    <View
      className="absolute left-0 right-0 flex-row items-center justify-between px-4"
      pointerEvents="box-none"
      style={{ top: insets.top + 8 }}
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
    </View>
  );
}
