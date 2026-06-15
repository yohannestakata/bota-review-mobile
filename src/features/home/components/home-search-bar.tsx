import { Search01Icon } from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
import { Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";

type HomeSearchBarProps = {
  onPress: () => void;
};

export function HomeSearchBar({ onPress }: HomeSearchBarProps) {
  return (
    <Pressable
      className="h-16 flex-row items-center gap-2 rounded-full bg-white px-6"
      onPress={onPress}
    >
      <AppIcon color={colors.muted} icon={Search01Icon} size={24} />
      <ThemedText size="md" tone="muted">
        Search restaurants, cafés, cuisines
      </ThemedText>
    </Pressable>
  );
}
