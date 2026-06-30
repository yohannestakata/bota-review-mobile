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
      className="h-[74px] flex-row items-center gap-3 rounded-full border border-border bg-surface px-7"
      onPress={onPress}
      style={shadows.searchBar}
    >
      <AppIcon color={colors.primary} icon={Search01Icon} size={26} />
      <ThemedText size="lg" tone="default" weight="medium">
        Search restaurants, cafés, cuisines
      </ThemedText>
    </Pressable>
  );
}
