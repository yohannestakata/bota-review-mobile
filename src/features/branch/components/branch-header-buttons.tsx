import { ArrowLeft01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { colors, shadows } from "@/lib/theme";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";

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

      <IconButton
        accessibilityLabel={isSaved ? "Remove from saved" : "Save branch"}
        icon={FavouriteIcon}
        onPress={onToggleSave}
        size={44}
        style={shadows.navigation}
      >
        <AppIcon
          color={isSaved ? colors.favorite : colors.foreground}
          icon={FavouriteIcon}
          size={20}
          strokeWidth={isSaved ? 2.5 : 2}
        />
      </IconButton>
    </View>
  );
}
