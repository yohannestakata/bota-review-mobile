import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthField } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useCreateBranchSubmission,
  type BranchSubmissionBody,
} from "@/features/submissions";
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

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

function Pill({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      className={`rounded-full px-4 py-2 ${selected ? "bg-black" : "bg-surface"}`}
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
  const [error, setError] = useState("");

  const isCorrection = kind === "field_correction";
  const selectedField = FIELDS.find(
    (field): field is FieldOption => field.value === fieldName,
  );
  const isValueCorrection = isCorrection && selectedField?.mode === "value";
  const isPriceCorrection = isCorrection && selectedField?.mode === "price";
  const isNoteCorrection = isCorrection && selectedField?.mode === "note";
  const canSubmit =
    !submit.isPending &&
    (!isCorrection ||
      (Boolean(fieldName) &&
        (isValueCorrection || isPriceCorrection
          ? suggestedValue.trim().length > 0
          : note.trim().length > 0)));

  function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setError("");

    const correctionValue =
      isValueCorrection || isPriceCorrection ? suggestedValue.trim() : "";
    const body: BranchSubmissionBody = isCorrection
      ? {
          type: "field_correction",
          fieldName,
          ...(correctionValue ? { suggestedValue: correctionValue } : {}),
          ...(note.trim() ? { note: note.trim() } : {}),
        }
      : { type: kind, ...(note.trim() ? { note: note.trim() } : {}) };

    submit.mutate(body, {
      onSuccess: () => {
        Alert.alert(
          "Good catch!",
          "Thanks — we'll review your suggestion.",
        );
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
                  setSuggestedValue("");
                  setNote("");
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
                        setSuggestedValue("");
                        setNote("");
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
                <View>
                  <ThemedText size="sm" weight="medium">
                    What should we know?
                  </ThemedText>
                  <TextInput
                    className="mt-2 min-h-28 rounded-2xl bg-surface px-4 py-3 font-outfit text-md text-foreground"
                    multiline
                    onChangeText={setNote}
                    placeholder="Tell us what needs attention."
                    placeholderTextColor={colors.muted}
                    textAlignVertical="top"
                    value={note}
                  />
                </View>
              ) : null}

            </>
          ) : null}

          {!isNoteCorrection ? (
            <View>
              <ThemedText size="sm" weight="medium">
                Note {isCorrection ? "(optional)" : ""}
              </ThemedText>
              <TextInput
                className="mt-2 min-h-24 rounded-2xl bg-surface px-4 py-3 font-outfit text-md text-foreground"
                multiline
                onChangeText={setNote}
                placeholder="Anything else we should know?"
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
                value={note}
              />
            </View>
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
