import { Search01Icon } from "@hugeicons/core-free-icons";
import { colors, shadows } from "@/lib/theme";
import { Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";

type HomeSearchBarProps = {
  onPress: () => void;
};

export function HomeSearchBar({ onPress }: HomeSearchBarProps) {
  return (
    <Pressable
      className="h-14 flex-row items-center gap-2.5 rounded-full border border-border bg-surface px-5"
      onPress={onPress}
      style={shadows.searchBar}
    >
      <AppIcon color={colors.primary} icon={Search01Icon} size={22} />
      <ThemedText
        className="min-w-0 flex-1"
        numberOfLines={1}
        size="lg"
        tone="default"
        weight="medium"
      >
        What are you craving?
      </ThemedText>
    </Pressable>
  );
}
