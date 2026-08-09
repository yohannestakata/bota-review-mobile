import { useState } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { useTasteOptionsQuery } from "../queries";

const GROUP_LABELS = {
  food: "What sounds good?",
  mood: "What is the mood?",
  time: "When do you usually look?",
} as const;

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
  const options = useTasteOptionsQuery();
  const [dismissed, setDismissed] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const show = ready && !dismissed && (picks.length === 0 || hasInteracted);

  if (!show || !options.data || options.data.length === 0) return null;

  return (
    <View className="mt-6 bg-personalized px-6 py-6">
      <View className="gap-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1">
            <ThemedText tone="brand" weight="bold">
              What are you into?
            </ThemedText>
            <ThemedText className="mt-0.5" size="sm" tone="muted">
              Pick a few and we&apos;ll bump them up your feed.
            </ThemedText>
          </View>
          <Pressable hitSlop={8} onPress={() => setDismissed(true)}>
            <ThemedText
              size="sm"
              tone={picks.length ? "brand" : "muted"}
              weight="medium"
            >
              {picks.length ? "Done" : "Skip"}
            </ThemedText>
          </Pressable>
        </View>

        {(["food", "mood", "time"] as const).map((group) => (
          <View className="gap-2" key={group}>
            <ThemedText size="sm" tone="muted" weight="medium">
              {GROUP_LABELS[group]}
            </ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {options.data
                .filter((option) => option.group === group)
                .map((option) => {
                  const selected = picks.includes(option.id);
                  return (
                    <Pressable
                      className={cn(
                        "rounded-full border px-4 py-2",
                        selected
                          ? "border-primary bg-primary"
                          : "border-border bg-surface",
                      )}
                      key={option.id}
                      onPress={() => {
                        setHasInteracted(true);
                        onToggle(option.id);
                      }}
                    >
                      <ThemedText
                        size="sm"
                        tone={selected ? "inverse" : "default"}
                        weight="medium"
                      >
                        {option.name}
                      </ThemedText>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}
