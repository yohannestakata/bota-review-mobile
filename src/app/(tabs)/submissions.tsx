import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthField } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { FormTextArea, FormTextInput } from "@/components/ui/form-field";
import { OptionalDetailsPanel } from "@/components/ui/optional-details-panel";
import { ThemedText } from "@/components/ui/themed-text";
import {
  NeighborhoodField,
  useReportMissingPlace,
  type PlaceMissingDetails,
} from "@/features/submissions";
import { cn } from "@/lib/cn";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

const PRICE_LEVELS = [
  { value: "1", label: "$" },
  { value: "2", label: "$$" },
  { value: "3", label: "$$$" },
  { value: "4", label: "$$$$" },
] as const;

const AMENITIES = [
  "Wi-Fi",
  "Parking",
  "Outdoor seating",
  "Good for work",
  "Good for groups",
  "Fasting options",
] as const;

const SUBMISSION_NOTE_LIMIT = 500;

function Pill({
  label,
  selected,
  onPress,
  surface = "default",
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
  surface?: "default" | "muted";
}) {
  return (
    <Pressable
      className={cn(
        "rounded-full px-4 py-2",
        surface === "muted" && "border",
        selected && "bg-black",
        !selected && surface === "default" && "bg-surface",
        !selected && surface === "muted" && "border-border bg-background",
      )}
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

export default function SubmissionsScreen() {
  const report = useReportMissingPlace();

  const [placeName, setPlaceName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [helpMore, setHelpMore] = useState(false);
  const [priceLevel, setPriceLevel] = useState("");
  const [hours, setHours] = useState("");
  const [menu, setMenu] = useState("");
  const [amenities, setAmenities] = useState<string[]>([]);
  const [error, setError] = useState("");

  const canSubmit = placeName.trim().length > 0 && !report.isPending;

  function reset() {
    setPlaceName("");
    setNeighborhood("");
    setDescription("");
    setContactPhone("");
    setContactEmail("");
    setHelpMore(false);
    setPriceLevel("");
    setHours("");
    setMenu("");
    setAmenities([]);
  }

  function toggleAmenity(value: string) {
    setAmenities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function extraDetailsNote() {
    const lines: string[] = [];
    if (priceLevel)
      lines.push(`Price range: ${"$".repeat(Number(priceLevel))}`);
    if (hours.trim()) lines.push(`Hours: ${hours.trim()}`);
    if (menu.trim()) lines.push(`Menu/prices: ${menu.trim()}`);
    if (amenities.length > 0) lines.push(`Amenities: ${amenities.join(", ")}`);

    return lines.length > 0
      ? `Help complete this missing place:\n${lines.join("\n")}`
      : "";
  }

  function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setError("");

    const details: PlaceMissingDetails = { placeName: placeName.trim() };
    if (neighborhood.trim()) details.neighborhood = neighborhood.trim();
    if (description.trim()) details.description = description.trim();
    if (contactPhone.trim()) details.contactPhone = contactPhone.trim();
    if (contactEmail.trim()) details.contactEmail = contactEmail.trim();

    const note = extraDetailsNote();
    if (note.length > SUBMISSION_NOTE_LIMIT) {
      setError("Keep optional details under 500 characters total.");
      return;
    }

    report.mutate(
      { details, ...(note ? { note } : {}) },
      {
        onSuccess: () => {
          reset();
          Alert.alert(
            "Thanks for the tip!",
            "We'll take a look and get it added soon.",
          );
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pb-1 pt-2">
        <ThemedText size="3xl" weight="medium">
          Spotted a gem?
        </ThemedText>
        <ThemedText className="mt-1" tone="muted">
          Place name is enough. Add the area or details only if you know them.
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <AuthField
            autoCapitalize="words"
            label="Place name *"
            onChangeText={setPlaceName}
            placeholder="e.g. Tomoca Coffee"
            value={placeName}
          />
          <NeighborhoodField
            onChangeText={setNeighborhood}
            value={neighborhood}
          />

          <OptionalDetailsPanel
            expanded={helpMore}
            onToggle={() => setHelpMore((value) => !value)}
            subtitle="Add details only if they're handy."
            title="Know a little more?"
          >
            <FormTextArea
              inputClassName="min-h-28"
              label="What is it like?"
              onChangeText={(value) => setDescription(value.slice(0, 500))}
              placeholder="What kind of place is it? What's good there?"
              surface="muted"
              value={description}
            />

            <View className="gap-2">
              <ThemedText size="sm" weight="medium">
                Price range
              </ThemedText>
              <View className="flex-row flex-wrap gap-2">
                {PRICE_LEVELS.map((level) => (
                  <Pill
                    key={level.value}
                    label={level.label}
                    onPress={() =>
                      setPriceLevel((current) =>
                        current === level.value ? "" : level.value,
                      )
                    }
                    selected={priceLevel === level.value}
                    surface="muted"
                  />
                ))}
              </View>
            </View>

            <FormTextArea
              inputClassName="min-h-20"
              label="Hours"
              onChangeText={setHours}
              placeholder="e.g. Open late on weekends."
              surface="muted"
              value={hours}
            />

            <FormTextArea
              inputClassName="min-h-20"
              label="Menu or prices"
              onChangeText={setMenu}
              placeholder="e.g. Great breakfast, juice is around 120 birr."
              surface="muted"
              value={menu}
            />

            <View className="gap-3">
              <FormTextInput
                keyboardType="number-pad"
                label="Contact phone"
                onChangeText={(value) => setContactPhone(value.slice(0, 60))}
                placeholder="Their phone, if you know it"
                surface="muted"
                value={contactPhone}
              />
              <FormTextInput
                autoComplete="email"
                keyboardType="email-address"
                label="Contact email"
                onChangeText={setContactEmail}
                placeholder="Their email, if you know it"
                surface="muted"
                value={contactEmail}
              />
            </View>

            <View className="gap-2">
              <ThemedText size="sm" weight="medium">
                Amenities
              </ThemedText>
              <View className="flex-row flex-wrap gap-2">
                {AMENITIES.map((amenity) => (
                  <Pill
                    key={amenity}
                    label={amenity}
                    onPress={() => toggleAmenity(amenity)}
                    selected={amenities.includes(amenity)}
                    surface="muted"
                  />
                ))}
              </View>
            </View>
          </OptionalDetailsPanel>

          {error ? (
            <ThemedText size="sm" tone="brand">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!canSubmit}
            label="Send it in"
            loading={report.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
