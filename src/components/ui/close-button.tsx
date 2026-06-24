import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors, shadows } from "@/lib/theme";

export function CloseButton({
  onPress,
  overlay = false,
}: {
  onPress: () => void;
  overlay?: boolean;
}) {
  return (
    <Pressable
      accessibilityLabel="Close"
      accessibilityRole="button"
      className={`size-10 items-center justify-center rounded-full ${
        overlay ? "bg-white/20" : "bg-surface"
      }`}
      hitSlop={8}
      onPress={onPress}
      style={shadows.navigation}
    >
      <AppIcon
        color={overlay ? colors.inverse : colors.foreground}
        icon={Cancel01Icon}
        size={20}
      />
    </Pressable>
  );
}
