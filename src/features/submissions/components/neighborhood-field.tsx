import { useMemo, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import { useNeighborhoods } from "../queries";

type NeighborhoodFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
};

// Creatable autocomplete: suggests existing neighborhoods as the user types but
// still accepts a free-text value (a place may be somewhere not in the list yet).
export function NeighborhoodField({
  value,
  onChangeText,
}: NeighborhoodFieldProps) {
  const neighborhoods = useNeighborhoods();
  const [focused, setFocused] = useState(false);

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return (neighborhoods.data ?? [])
      .filter(
        (n) =>
          n.name.toLowerCase().includes(q) && n.name.toLowerCase() !== q,
      )
      .slice(0, 5);
  }, [value, neighborhoods.data]);

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <View>
      <ThemedText size="sm" weight="medium">
        Neighborhood
      </ThemedText>
      <TextInput
        autoCapitalize="words"
        className="mt-2 h-16 rounded-full bg-surface px-6 font-outfit text-md text-foreground"
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        placeholder="e.g. Bole"
        placeholderTextColor={colors.muted}
        value={value}
      />

      {showSuggestions ? (
        <View className="mt-2 overflow-hidden rounded-2xl border border-border bg-surface">
          {suggestions.map((neighborhood, index) => (
            <Pressable
              className={`px-5 py-3 ${index > 0 ? "border-t border-border" : ""}`}
              key={neighborhood.id}
              onPress={() => {
                onChangeText(neighborhood.name);
                setFocused(false);
              }}
            >
              <ThemedText>{neighborhood.name}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
