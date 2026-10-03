import { useMemo, useState } from "react";
import { View } from "react-native";

import { FormTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import { useNeighborhoods } from "@/features/taxonomy";
import { PressableFade } from "@/components/ui/pressable-scale";

type NeighborhoodFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  /** The listed neighborhood it matches, or null for one that isn't listed. */
  onMatch: (neighborhoodId: string | null) => void;
  required?: boolean;
  error?: string;
};

// Creatable autocomplete: suggests existing neighborhoods as the user types but
// still accepts a free-text value (a place may be somewhere not in the list yet).
export function NeighborhoodField({
  value,
  onChangeText,
  onMatch,
  required,
  error,
}: NeighborhoodFieldProps) {
  const neighborhoods = useNeighborhoods();
  const [focused, setFocused] = useState(false);
  // Typing a listed name exactly counts as picking it.
  const change = (text: string) => {
    onChangeText(text);
    const q = text.trim().toLowerCase();
    onMatch(
      neighborhoods.data?.find((n) => n.name.toLowerCase() === q)?.id ?? null,
    );
  };

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) {
      return [];
    }
    return (neighborhoods.data ?? [])
      .filter(
        (n) => n.name.toLowerCase().includes(q) && n.name.toLowerCase() !== q,
      )
      .slice(0, 5);
  }, [value, neighborhoods.data]);

  const showSuggestions = focused && suggestions.length > 0;

  return (
    <View>
      <FormTextInput
        autoCapitalize="words"
        error={error}
        label={required ? "Neighborhood" : "Neighborhood (optional)"}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        placeholder="e.g. Bole"
        value={value}
      />

      {showSuggestions ? (
        <View className="mt-2 overflow-hidden rounded-2xl border border-placeholder bg-surface">
          {suggestions.map((neighborhood, index) => (
            <PressableFade
              className={`px-5 py-3 ${index > 0 ? "border-t border-placeholder" : ""}`}
              key={neighborhood.id}
              onPress={() => {
                onChangeText(neighborhood.name);
                onMatch(neighborhood.id);
                setFocused(false);
              }}
            >
              <ThemedText>{neighborhood.name}</ThemedText>
            </PressableFade>
          ))}
        </View>
      ) : null}
    </View>
  );
}
