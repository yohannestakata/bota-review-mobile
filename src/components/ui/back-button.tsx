import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";

import { IconButton } from "@/components/ui/button";
import { shadows } from "@/lib/theme";

export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <IconButton
      accessibilityLabel="Go back"
      icon={ArrowLeft01Icon}
      onPress={onPress}
      style={shadows.navigation}
    />
  );
}
