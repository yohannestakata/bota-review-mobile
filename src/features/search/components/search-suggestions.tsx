import { Clock01Icon } from "@hugeicons/core-free-icons";
import { View } from "react-native";

import { ChipButton, TextButton } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";
import { PressableScale } from "@/components/ui/pressable-scale";

// Shown on the search screen before the user types: their recent searches and
// a few cuisines to jump straight into, so most searches are a single tap.
export function SearchSuggestions({
  recent,
  onPickRecent,
  onClearRecent,
  cuisines,
  onPickCuisine,
}: {
  recent: string[];
  onPickRecent: (query: string) => void;
  onClearRecent: () => void;
  cuisines: { id: string; name: string }[];
  onPickCuisine: (id: string) => void;
}) {
  const colors = useColors();
  if (recent.length === 0 && cuisines.length === 0) return null;

  return (
    <View className="mb-6 gap-5">
      {recent.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <ThemedText size="lg" weight="semibold">
              Recent
            </ThemedText>
            <TextButton
              accessibilityLabel="Clear recent searches"
              label="Clear"
              onPress={onClearRecent}
              tone="muted"
            />
          </View>
          <View className="flex-row flex-wrap gap-2">
            {recent.map((query) => (
              <PressableScale
                accessibilityLabel={`Search ${query} again`}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full border border-placeholder bg-surface px-4 py-2"
                key={query}
                onPress={() => onPickRecent(query)}
              >
                <AppIcon color={colors.muted} icon={Clock01Icon} size={14} />
                <ThemedText size="sm" weight="medium">
                  {query}
                </ThemedText>
              </PressableScale>
            ))}
          </View>
        </View>
      ) : null}

      {cuisines.length > 0 ? (
        <View className="gap-3">
          <ThemedText size="lg" weight="semibold">
            Craving something?
          </ThemedText>
          <View className="flex-row flex-wrap gap-2">
            {cuisines.map((cuisine) => (
              <ChipButton
                key={cuisine.id}
                label={cuisine.name}
                onPress={() => {
                  haptics.select();
                  onPickCuisine(cuisine.id);
                }}
                selected={false}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
