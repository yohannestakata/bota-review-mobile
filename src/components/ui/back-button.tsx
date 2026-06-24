import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors, shadows } from "@/lib/theme";

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel="Go back"
      accessibilityRole="button"
      className="size-10 items-center justify-center rounded-full bg-surface"
      hitSlop={8}
      onPress={onPress}
      style={shadows.navigation}
    >
      <AppIcon color={colors.foreground} icon={ArrowLeft01Icon} size={20} />
    </Pressable>
  );
}
