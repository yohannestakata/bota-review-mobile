import { zodFormResolver } from "@/lib/zod-resolver";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import {
  ControlledTextArea,
  ControlledTextInput,
} from "@/components/ui/form-field";
import { OptionalDetailsPanel } from "@/components/ui/optional-details-panel";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useCreateBranchSubmission,
  type BranchSubmissionBody,
} from "@/features/submissions";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { useDiscardConfirm } from "@/lib/use-discard-confirm";

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

const suggestEditObject = z.object({
  kind: z.enum([
    "field_correction",
    "temporarily_closed",
    "permanently_closed",
  ]),
  fieldName: z.string(),
  suggestedValue: z.string(),
  note: z.string(),
  extraPriceLevel: z.string(),
  extraHours: z.string(),
  extraMenu: z.string(),
  extraAddress: z.string(),
  extraPhone: z.string(),
  extraAmenities: z.array(z.string()),
});

type SuggestEditValues = z.infer<typeof suggestEditObject>;

const DEFAULT_VALUES: SuggestEditValues = {
  kind: "field_correction",
  fieldName: "",
  suggestedValue: "",
  note: "",
  extraPriceLevel: "",
  extraHours: "",
  extraMenu: "",
  extraAddress: "",
  extraPhone: "",
  extraAmenities: [],
};

function extraDetailsNote(values: SuggestEditValues) {
  const lines: string[] = [];
  if (values.extraPriceLevel) {
    lines.push(`Price range: ${"$".repeat(Number(values.extraPriceLevel))}`);
  }
  if (values.extraHours.trim()) lines.push(`Hours: ${values.extraHours.trim()}`);
  if (values.extraMenu.trim()) lines.push(`Menu/prices: ${values.extraMenu.trim()}`);
  if (values.extraAddress.trim()) {
    lines.push(`Address: ${values.extraAddress.trim()}`);
  }
  if (values.extraPhone.trim()) lines.push(`Phone: ${values.extraPhone.trim()}`);
  if (values.extraAmenities.length > 0) {
    lines.push(`Amenities: ${values.extraAmenities.join(", ")}`);
  }
  return lines.length > 0
    ? `Help complete this listing:\n${lines.join("\n")}`
    : "";
}

function submissionNote(values: SuggestEditValues) {
  return [values.note.trim(), extraDetailsNote(values)].filter(Boolean).join("\n\n");
}

const suggestEditSchema = suggestEditObject.superRefine((values, ctx) => {
  if (submissionNote(values).length > SUBMISSION_NOTE_LIMIT) {
    ctx.addIssue({
      code: "custom",
      path: ["note"],
      message: "Keep your note and extra details under 500 characters total.",
    });
  }
});

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
        selected && "bg-primary",
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

  const [helpMore, setHelpMore] = useState(false);

  const { control, handleSubmit, setError, setValue, formState } =
    useForm<SuggestEditValues>({
      resolver: zodFormResolver(suggestEditSchema),
      mode: "onChange",
      defaultValues: DEFAULT_VALUES,
    });

  const attemptClose = useDiscardConfirm(formState.isDirty);

  const values = useWatch({ control }) as SuggestEditValues;
  const isCorrection = values.kind === "field_correction";
  const selectedField = FIELDS.find((field) => field.value === values.fieldName);
  const isValueCorrection = isCorrection && selectedField?.mode === "value";
  const isPriceCorrection = isCorrection && selectedField?.mode === "price";
  const isNoteCorrection = isCorrection && selectedField?.mode === "note";

  const hasPrimaryCorrection =
    isValueCorrection || isPriceCorrection
      ? values.suggestedValue.trim().length > 0
      : values.note.trim().length > 0;
  const hasExtraDetails =
    Boolean(values.extraPriceLevel) ||
    values.extraHours.trim().length > 0 ||
    values.extraMenu.trim().length > 0 ||
    values.extraAddress.trim().length > 0 ||
    values.extraPhone.trim().length > 0 ||
    values.extraAmenities.length > 0;
  const canSubmit =
    !submit.isPending &&
    (!isCorrection ||
      (values.fieldName ? hasPrimaryCorrection || hasExtraDetails : hasExtraDetails));

  function resetPrimaryFields() {
    setValue("suggestedValue", "");
    setValue("note", "");
  }

  function resetContributionFields() {
    resetPrimaryFields();
    setValue("extraPriceLevel", "");
    setValue("extraHours", "");
    setValue("extraMenu", "");
    setValue("extraAddress", "");
    setValue("extraPhone", "");
    setValue("extraAmenities", []);
  }

  function toggleAmenity(value: string) {
    setValue(
      "extraAmenities",
      values.extraAmenities.includes(value)
        ? values.extraAmenities.filter((item) => item !== value)
        : [...values.extraAmenities, value],
      { shouldValidate: true },
    );
  }

  const onSubmit = handleSubmit((formValues) => {
    const correctionValue =
      isValueCorrection || isPriceCorrection
        ? formValues.suggestedValue.trim()
        : "";
    const noteValue = submissionNote(formValues);

    const body: BranchSubmissionBody =
      formValues.kind === "field_correction"
        ? {
            type: "field_correction",
            fieldName: formValues.fieldName || LISTING_DETAILS_FIELD,
            ...(correctionValue ? { suggestedValue: correctionValue } : {}),
            ...(noteValue ? { note: noteValue } : {}),
          }
        : { type: formValues.kind, ...(noteValue ? { note: noteValue } : {}) };

    return new Promise<void>((resolve) => {
      submit.mutate(body, {
        onSuccess: () => {
          analytics.track("edit_suggested", {
            branch_id: branchId,
            submission_type: body.type,
          });
          Alert.alert("Good catch!", "Thanks — we'll review your suggestion.");
          router.back();
          resolve();
        },
        onError: (err) => {
          setError("root", { message: getErrorMessage(err) });
          resolve();
        },
      });
    });
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <CloseButton onPress={attemptClose} />
        <ThemedText size="lg" weight="semibold">
          Suggest an edit
        </ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
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
                  setValue("kind", option.value, { shouldValidate: true });
                  setValue("fieldName", "");
                  resetContributionFields();
                }}
                selected={values.kind === option.value}
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
                        setValue("fieldName", field.value, {
                          shouldValidate: true,
                        });
                        resetPrimaryFields();
                      }}
                      selected={values.fieldName === field.value}
                    />
                  ))}
                </View>
              </View>

              {isValueCorrection ? (
                <ControlledTextInput
                  control={control}
                  label="Correct value"
                  name="suggestedValue"
                  placeholder="What should it say?"
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
                        onPress={() =>
                          setValue("suggestedValue", level.value, {
                            shouldValidate: true,
                          })
                        }
                        selected={values.suggestedValue === level.value}
                      />
                    ))}
                  </View>
                </View>
              ) : null}

              {isNoteCorrection ? (
                <ControlledTextArea
                  control={control}
                  inputClassName="min-h-28"
                  label="What should we know?"
                  name="note"
                  placeholder="Tell us what needs attention."
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
                        setValue(
                          "extraPriceLevel",
                          values.extraPriceLevel === level.value
                            ? ""
                            : level.value,
                          { shouldValidate: true },
                        )
                      }
                      selected={values.extraPriceLevel === level.value}
                      surface="muted"
                    />
                  ))}
                </View>
              </View>
            ) : null}

            <ControlledTextArea
              control={control}
              inputClassName="min-h-20"
              label="Hours"
              name="extraHours"
              placeholder="e.g. Open until 10 most nights."
              surface="muted"
            />

            <ControlledTextArea
              control={control}
              inputClassName="min-h-20"
              label="Menu or prices"
              name="extraMenu"
              placeholder="e.g. Macchiato is 90 birr now."
              surface="muted"
            />

            <View className="gap-3">
              <ControlledTextInput
                control={control}
                label="Address"
                maxLength={80}
                name="extraAddress"
                placeholder="Only if you know it"
                surface="muted"
              />
              <ControlledTextInput
                control={control}
                label="Phone"
                maxLength={40}
                name="extraPhone"
                placeholder="Only if you know it"
                surface="muted"
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
                    selected={values.extraAmenities.includes(amenity)}
                    surface="muted"
                  />
                ))}
              </View>
            </View>
          </OptionalDetailsPanel>

          {!isNoteCorrection ? (
            <ControlledTextArea
              control={control}
              label={`Note ${isCorrection ? "(optional)" : ""}`}
              name="note"
              placeholder="Anything else we should know?"
            />
          ) : null}

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
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
