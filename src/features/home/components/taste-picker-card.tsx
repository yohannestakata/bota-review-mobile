import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { useCuisines } from "@/features/search";
import { cn } from "@/lib/cn";

// First-run taste capture: pick a few cuisines and the feed bumps them up. Only
// auto-shows when the user hasn't set any yet; picks apply live to the feed
// below. State is owned by the parent so ranking + card stay in sync.
export function TastePickerCard({
  picks,
  onToggle,
  ready,
}: {
  picks: string[];
  onToggle: (slug: string) => void;
  ready: boolean;
}) {
  const cuisines = useCuisines();
  const [show, setShow] = useState<boolean | null>(null);

  useEffect(() => {
    if (ready && show === null) setShow(picks.length === 0);
  }, [ready, picks.length, show]);

  if (!show || !cuisines.data || cuisines.data.length === 0) return null;

  return (
    <View className="mt-6 px-6">
      <View className="gap-3 rounded-2xl border border-placeholder bg-surface p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <ThemedText weight="semibold">What are you into?</ThemedText>
            <ThemedText className="mt-0.5" size="sm" tone="muted">
              Pick a few and we&apos;ll bump them up your feed.
            </ThemedText>
          </View>
          <Pressable hitSlop={8} onPress={() => setShow(false)}>
            <ThemedText
              size="sm"
              tone={picks.length ? "brand" : "muted"}
              weight="medium"
            >
              {picks.length ? "Done" : "Skip"}
            </ThemedText>
          </Pressable>
        </View>

        <View className="flex-row flex-wrap gap-2">
          {cuisines.data.map((cuisine) => {
            const selected = picks.includes(cuisine.slug);
            return (
              <Pressable
                className={cn(
                  "rounded-full px-4 py-2",
                  selected
                    ? "bg-primary"
                    : "border border-placeholder bg-background",
                )}
                key={cuisine.slug}
                onPress={() => onToggle(cuisine.slug)}
              >
                <ThemedText
                  size="sm"
                  tone={selected ? "inverse" : "default"}
                  weight="medium"
                >
                  {cuisine.name}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}
