import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/ui/screen-header";
import { SkeletonChips, SkeletonText } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
import { useTasteOptionsQuery, useTastePreferences } from "@/features/home";
import { cn } from "@/lib/cn";
import { PressableScale } from "@/components/ui/pressable-scale";

export default function TastePreferencesScreen() {
  const options = useTasteOptionsQuery();
  const tastes = useTastePreferences();
  const loading = options.isPending || !tastes.ready;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <BackHeader title="Your tastes" />

      <View className="px-6 pt-3">
        <ThemedText size="xl" tone="heading" weight="bold">
          What are you usually in the mood for?
        </ThemedText>
        <ThemedText className="mt-1" tone="muted">
          Pick a few and we will shape your For you picks around them.
        </ThemedText>

        {loading ? (
          <View className="mt-6 gap-6">
            {[5, 4, 3].map((count) => (
              <View className="gap-2" key={count}>
                <SkeletonText className="w-40" />
                <SkeletonChips count={count} />
              </View>
            ))}
          </View>
        ) : (
          <View className="mt-6 gap-6">
            {(
              [
                ["food", "What sounds good?"],
                ["mood", "What is the mood?"],
                ["time", "When do you usually look?"],
              ] as const
            ).map(([group, label]) => (
              <View className="gap-2" key={group}>
                <ThemedText weight="semibold">{label}</ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {options.data
                    ?.filter((option) => option.group === group)
                    .map((option) => {
                      const selected = tastes.tasteOptionIds.includes(
                        option.id,
                      );
                      return (
                        <PressableScale
                          className={cn(
                            "rounded-full border px-4 py-2.5",
                            selected
                              ? "border-primary bg-primary"
                              : "border-border bg-surface",
                          )}
                          key={option.id}
                          onPress={() => tastes.toggle(option.id)}
                        >
                          <ThemedText
                            tone={selected ? "inverse" : "default"}
                            weight="medium"
                          >
                            {option.name}
                          </ThemedText>
                        </PressableScale>
                      );
                    })}
                </View>
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
