import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
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
import { AppIcon } from "@/components/ui/huge-icon";
import { OptionalDetailsPanel } from "@/components/ui/optional-details-panel";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useCreateBranchSubmission,
  type BranchSubmissionBody,
} from "@/features/submissions";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

type Kind = "field_correction" | "temporarily_closed" | "permanently_closed";

const KINDS: { value: Kind; label: string }[] = [
  { value: "field_correction", label: "Correction" },
  { value: "temporarily_closed", label: "Temporarily closed" },
  { value: "permanently_closed", label: "Permanently closed" },
];

const FIELDS = [
  { value: "Name", label: "Name", mode: "value" },
  { value: "Phone", label: "Phone", mode: "value" },
  { value: "Address", label: "Address", mode: "value" },
  { value: "Price", label: "Price", mode: "price" },
  { value: "Hours", label: "Hours", mode: "note" },
  { value: "Menu/prices", label: "Menu/prices", mode: "note" },
  { value: "Photos", label: "Photos", mode: "note" },
  { value: "Tags/amenities", label: "Tags/amenities", mode: "note" },
  { value: "Wrong info", label: "Wrong info", mode: "note" },
  { value: "Duplicate", label: "Duplicate", mode: "note" },
] as const;

type FieldOption = (typeof FIELDS)[number];

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

const LISTING_DETAILS_FIELD = "Listing details";
const SUBMISSION_NOTE_LIMIT = 500;

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

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

export default function SuggestEditScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const submit = useCreateBranchSubmission(branchId);

  const [kind, setKind] = useState<Kind>("field_correction");
  const [fieldName, setFieldName] = useState("");
  const [suggestedValue, setSuggestedValue] = useState("");
  const [note, setNote] = useState("");
  const [helpMore, setHelpMore] = useState(false);
  const [extraPriceLevel, setExtraPriceLevel] = useState("");
  const [extraHours, setExtraHours] = useState("");
  const [extraMenu, setExtraMenu] = useState("");
  const [extraAddress, setExtraAddress] = useState("");
  const [extraPhone, setExtraPhone] = useState("");
  const [extraAmenities, setExtraAmenities] = useState<string[]>([]);
  const [error, setError] = useState("");

  const isCorrection = kind === "field_correction";
  const selectedField = FIELDS.find(
    (field): field is FieldOption => field.value === fieldName,
  );
  const isValueCorrection = isCorrection && selectedField?.mode === "value";
  const isPriceCorrection = isCorrection && selectedField?.mode === "price";
  const isNoteCorrection = isCorrection && selectedField?.mode === "note";
  const hasPrimaryCorrection =
    isValueCorrection || isPriceCorrection
      ? suggestedValue.trim().length > 0
      : note.trim().length > 0;
  const hasExtraDetails =
    Boolean(extraPriceLevel) ||
    extraHours.trim().length > 0 ||
    extraMenu.trim().length > 0 ||
    extraAddress.trim().length > 0 ||
    extraPhone.trim().length > 0 ||
    extraAmenities.length > 0;
  const canSubmit =
    !submit.isPending &&
    (!isCorrection ||
      (fieldName ? hasPrimaryCorrection || hasExtraDetails : hasExtraDetails));

  function resetPrimaryFields() {
    setSuggestedValue("");
    setNote("");
  }

  function resetContributionFields() {
    resetPrimaryFields();
    setExtraPriceLevel("");
    setExtraHours("");
    setExtraMenu("");
    setExtraAddress("");
    setExtraPhone("");
    setExtraAmenities([]);
  }

  function toggleAmenity(value: string) {
    setExtraAmenities((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function extraDetailsNote() {
    const lines: string[] = [];
    if (extraPriceLevel) {
      lines.push(`Price range: ${"$".repeat(Number(extraPriceLevel))}`);
    }
    if (extraHours.trim()) lines.push(`Hours: ${extraHours.trim()}`);
    if (extraMenu.trim()) lines.push(`Menu/prices: ${extraMenu.trim()}`);
    if (extraAddress.trim()) lines.push(`Address: ${extraAddress.trim()}`);
    if (extraPhone.trim()) lines.push(`Phone: ${extraPhone.trim()}`);
    if (extraAmenities.length > 0) {
      lines.push(`Amenities: ${extraAmenities.join(", ")}`);
    }
    return lines.length > 0
      ? `Help complete this listing:\n${lines.join("\n")}`
      : "";
  }

  function submissionNote() {
    return [note.trim(), extraDetailsNote()].filter(Boolean).join("\n\n");
  }

  function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setError("");

    const correctionValue =
      isValueCorrection || isPriceCorrection ? suggestedValue.trim() : "";
    const noteValue = submissionNote();
    if (noteValue.length > SUBMISSION_NOTE_LIMIT) {
      setError("Keep your note and extra details under 500 characters total.");
      return;
    }

    const body: BranchSubmissionBody = isCorrection
      ? {
          type: "field_correction",
          fieldName: fieldName || LISTING_DETAILS_FIELD,
          ...(correctionValue ? { suggestedValue: correctionValue } : {}),
          ...(noteValue ? { note: noteValue } : {}),
        }
      : { type: kind, ...(noteValue ? { note: noteValue } : {}) };

    submit.mutate(body, {
      onSuccess: () => {
        Alert.alert("Good catch!", "Thanks — we'll review your suggestion.");
        router.back();
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <AppIcon color={colors.foreground} icon={Cancel01Icon} size={24} />
        </Pressable>
        <ThemedText size="lg" weight="semibold">
          Suggest an edit
        </ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          {name ? (
            <ThemedText tone="muted">
              About <ThemedText weight="medium">{name}</ThemedText>
            </ThemedText>
          ) : null}

          <View className="flex-row flex-wrap gap-2">
            {KINDS.map((option) => (
              <Pill
                key={option.value}
                label={option.label}
                onPress={() => {
                  setKind(option.value);
                  setFieldName("");
                  resetContributionFields();
                }}
                selected={kind === option.value}
              />
            ))}
          </View>

          {isCorrection ? (
            <>
              <View className="gap-2">
                <ThemedText size="sm" weight="medium">
                  What needs fixing?
                </ThemedText>
                <View className="flex-row flex-wrap gap-2">
                  {FIELDS.map((field) => (
                    <Pill
                      key={field.value}
                      label={field.label}
                      onPress={() => {
                        setFieldName(field.value);
                        resetPrimaryFields();
                      }}
                      selected={fieldName === field.value}
                    />
                  ))}
                </View>
              </View>

              {isValueCorrection ? (
                <AuthField
                  label="Correct value"
                  onChangeText={setSuggestedValue}
                  placeholder="What should it say?"
                  value={suggestedValue}
                />
              ) : null}

              {isPriceCorrection ? (
                <View className="gap-2">
                  <ThemedText size="sm" weight="medium">
                    What is the price level?
                  </ThemedText>
                  <View className="flex-row flex-wrap gap-2">
                    {PRICE_LEVELS.map((level) => (
                      <Pill
                        key={level.value}
                        label={level.label}
                        onPress={() => setSuggestedValue(level.value)}
                        selected={suggestedValue === level.value}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {isNoteCorrection ? (
                <FormTextArea
                  inputClassName="min-h-28"
                  label="What should we know?"
                  onChangeText={setNote}
                  placeholder="Tell us what needs attention."
                  value={note}
                />
              ) : null}
            </>
          ) : null}

          <OptionalDetailsPanel
            expanded={helpMore}
            onToggle={() => setHelpMore((value) => !value)}
            subtitle="Add details only if they're handy."
            title="Know a little more?"
          >
            {!isPriceCorrection ? (
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
                        setExtraPriceLevel((current) =>
                          current === level.value ? "" : level.value,
                        )
                      }
                      selected={extraPriceLevel === level.value}
                      surface="muted"
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <FormTextArea
              inputClassName="min-h-20"
              label="Hours"
              onChangeText={setExtraHours}
              placeholder="e.g. Open until 10 most nights."
              surface="muted"
              value={extraHours}
            />

            <FormTextArea
              inputClassName="min-h-20"
              label="Menu or prices"
              onChangeText={setExtraMenu}
              placeholder="e.g. Macchiato is 90 birr now."
              surface="muted"
              value={extraMenu}
            />

            <View className="gap-3">
              <FormTextInput
                label="Address"
                onChangeText={(value) => setExtraAddress(value.slice(0, 80))}
                placeholder="Only if you know it"
                surface="muted"
                value={extraAddress}
              />
              <FormTextInput
                label="Phone"
                onChangeText={(value) => setExtraPhone(value.slice(0, 40))}
                placeholder="Only if you know it"
                surface="muted"
                value={extraPhone}
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
                    selected={extraAmenities.includes(amenity)}
                    surface="muted"
                  />
                ))}
              </View>
            </View>
          </OptionalDetailsPanel>

          {!isNoteCorrection ? (
            <FormTextArea
              label={`Note ${isCorrection ? "(optional)" : ""}`}
              onChangeText={setNote}
              placeholder="Anything else we should know?"
              value={note}
            />
          ) : null}

          {error ? (
            <ThemedText size="sm" tone="brand">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!canSubmit}
            label="Send suggestion"
            loading={submit.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
