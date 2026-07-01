import { Cancel01Icon } from "@hugeicons/core-free-icons";

import { IconButton } from "@/components/ui/button";
import { shadows } from "@/lib/theme";

export function CloseButton({
  onPress,
  overlay = false,
}: {
  onPress: () => void;
  overlay?: boolean;
}) {
  return (
    <IconButton
      accessibilityLabel="Close"
      icon={Cancel01Icon}
      onPress={onPress}
      overlay={overlay}
      style={shadows.navigation}
    />
  );
}
