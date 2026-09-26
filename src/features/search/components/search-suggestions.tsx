import { Clock01Icon } from "@hugeicons/core-free-icons";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";

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
  if (recent.length === 0 && cuisines.length === 0) return null;

  return (
    <View className="mb-6 gap-5">
      {recent.length > 0 ? (
        <View className="gap-3">
          <View className="flex-row items-center justify-between">
            <ThemedText size="lg" weight="semibold">
              Recent
            </ThemedText>
            <Pressable hitSlop={8} onPress={onClearRecent}>
              <ThemedText size="sm" tone="muted" weight="medium">
                Clear
              </ThemedText>
            </Pressable>
          </View>
          <View className="flex-row flex-wrap gap-2">
            {recent.map((query) => (
              <Pressable
                accessibilityLabel={`Search ${query} again`}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-2"
                key={query}
                onPress={() => onPickRecent(query)}
              >
                <AppIcon color={colors.muted} icon={Clock01Icon} size={14} />
                <ThemedText size="sm" weight="medium">
                  {query}
                </ThemedText>
              </Pressable>
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
              <Pressable
                className="rounded-full bg-surface-muted px-4 py-2"
                key={cuisine.id}
                onPress={() => {
                  haptics.select();
                  onPickCuisine(cuisine.id);
                }}
              >
                <ThemedText size="sm" weight="medium">
                  {cuisine.name}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}
