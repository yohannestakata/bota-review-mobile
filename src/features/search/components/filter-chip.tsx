import { Pressable } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
};

export function FilterChip({ label, selected, onPress }: FilterChipProps) {
  return (
    <Pressable
      className={`rounded-full px-4 py-2 ${
        selected ? "bg-primary" : "border border-placeholder bg-surface"
      }`}
      onPress={onPress}
    >
      <ThemedText
        size="sm"
        tone={selected ? "inverse" : "default"}
        weight="medium"
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}
