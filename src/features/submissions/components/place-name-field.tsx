import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";

import { FormTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import type { PlaceSearchResult } from "@/lib/api";

import { useSearchPlaces } from "../queries";

type PlaceNameFieldProps = {
  name: string;
  existingPlaceId?: string;
  error?: string;
  onChangeName: (value: string) => void;
  // Called with a place when the submitter picks an existing one (adding a
  // branch), or null when they clear it (creating a brand-new place).
  onSelectPlace: (place: PlaceSearchResult | null) => void;
};

// The place-name input with live search against existing places. Picking a
// match flips the tip into "add a new location" mode so we never create a
// duplicate place for a spot Bota already knows.
export function PlaceNameField({
  name,
  existingPlaceId,
  error,
  onChangeName,
  onSelectPlace,
}: PlaceNameFieldProps) {
  const [focused, setFocused] = useState(false);
  const [debounced, setDebounced] = useState(name);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(name), 250);
    return () => clearTimeout(timer);
  }, [name]);

  // Don't keep searching once a place is locked in.
  const search = useSearchPlaces(existingPlaceId ? "" : debounced);

  // When a place is selected, show a locked chip with a way back to search.
  if (existingPlaceId) {
    return (
      <View className="gap-2">
        <ThemedText size="sm" weight="medium">
          Place *
        </ThemedText>
        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-primary bg-primary/10 px-4 py-3">
          <View className="flex-1">
            <ThemedText weight="semibold">{name}</ThemedText>
            <ThemedText className="mt-0.5" size="sm" tone="muted">
              Adding a new location to this place
            </ThemedText>
          </View>
          <Pressable hitSlop={8} onPress={() => onSelectPlace(null)}>
            <ThemedText size="sm" tone="brand" weight="medium">
              Change
            </ThemedText>
          </Pressable>
        </View>
      </View>
    );
  }

  const results = search.data ?? [];
  const showResults =
    focused && name.trim().length >= 2 && results.length > 0;

  return (
    <View>
      <FormTextInput
        autoCapitalize="words"
        error={error}
        label="Place name *"
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onChangeText={onChangeName}
        onFocus={() => setFocused(true)}
        placeholder="e.g. Tomoca Coffee"
        value={name}
      />

      {showResults ? (
        <View className="mt-2 overflow-hidden rounded-2xl border border-placeholder bg-surface">
          <View className="px-5 pb-1 pt-3">
            <ThemedText size="xs" tone="muted" weight="medium">
              Already on Bota? Add a location to it
            </ThemedText>
          </View>
          {results.map((place, index) => (
            <Pressable
              className={`px-5 py-3 ${index > 0 ? "border-t border-placeholder" : ""}`}
              key={place.id}
              onPress={() => {
                onSelectPlace(place);
                setFocused(false);
              }}
            >
              <ThemedText weight="medium">{place.name}</ThemedText>
              <ThemedText className="mt-0.5" size="sm" tone="muted">
                {place.branchCount} location
                {place.branchCount === 1 ? "" : "s"} on Bota
              </ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}
