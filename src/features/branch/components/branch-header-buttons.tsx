import { ArrowLeft01Icon, FavouriteIcon } from "@hugeicons/core-free-icons";
import { colors, shadows } from "@/lib/theme";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";

function CircleButton({
  children,
  onPress,
}: {
  children: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      className="size-11 items-center justify-center rounded-full bg-surface"
      hitSlop={8}
      onPress={onPress}
      style={shadows.navigation}
    >
      {children}
    </Pressable>
  );
}

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
      <CircleButton onPress={onBack}>
        <AppIcon color={colors.foreground} icon={ArrowLeft01Icon} size={22} />
      </CircleButton>

      <CircleButton onPress={onToggleSave}>
        <AppIcon
          color={isSaved ? colors.favorite : colors.foreground}
          icon={FavouriteIcon}
          size={20}
          strokeWidth={isSaved ? 2.5 : 2}
        />
      </CircleButton>
    </View>
  );
}
