import { zodFormResolver } from "@/lib/zod-resolver";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
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
import { ControlledPhoneInput } from "@/components/ui/phone-input";
import { ThemedText } from "@/components/ui/themed-text";
import {
  HoursField,
  MenuField,
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
  { value: "Hours", label: "Hours", mode: "note" },
  { value: "Menu/prices", label: "Menu/prices", mode: "note" },
  { value: "Photos", label: "Photos", mode: "note" },
  { value: "Tags/amenities", label: "Tags/amenities", mode: "note" },
  { value: "Wrong info", label: "Wrong info", mode: "note" },
  { value: "Duplicate", label: "Duplicate", mode: "note" },
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
});

type SuggestEditValues = z.infer<typeof suggestEditObject>;

const DEFAULT_VALUES: SuggestEditValues = {
  kind: "field_correction",
  fieldName: "",
  suggestedValue: "",
  note: "",
};

function submissionNote(values: SuggestEditValues) {
  return values.note.trim();
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
        !selected && surface === "muted" && "border-placeholder bg-background",
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

  const { control, handleSubmit, setError, setValue, formState } =
    useForm<SuggestEditValues>({
      resolver: zodFormResolver(suggestEditSchema),
      mode: "onChange",
      defaultValues: DEFAULT_VALUES,
    });

  const attemptClose = useDiscardConfirm(formState.isDirty);

  const values = useWatch({ control }) as SuggestEditValues;
  const isCorrection = values.kind === "field_correction";
  const selectedField = FIELDS.find(
    (field) => field.value === values.fieldName,
  );
  const isValueCorrection = isCorrection && selectedField?.mode === "value";
  const isNoteCorrection = isCorrection && selectedField?.mode === "note";

  const hasPrimaryCorrection = isValueCorrection
    ? values.suggestedValue.trim().length > 0
    : values.note.trim().length > 0;
  const canSubmit =
    !submit.isPending &&
    (!isCorrection || (Boolean(values.fieldName) && hasPrimaryCorrection));

  function resetPrimaryFields() {
    setValue("suggestedValue", "");
    setValue("note", "");
  }

  function resetContributionFields() {
    resetPrimaryFields();
  }

  const onSubmit = handleSubmit((formValues) => {
    const correctionValue = isValueCorrection
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
          Alert.alert("Good catch!", "We'll check it and tidy up the listing.");
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
        <ThemedText size="xl" weight="bold">
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
                selectedField?.value === "Phone" ? (
                  <ControlledPhoneInput
                    control={control}
                    label="Correct value"
                    name="suggestedValue"
                  />
                ) : (
                  <ControlledTextInput
                    control={control}
                    label="Correct value"
                    name="suggestedValue"
                    placeholder="What should it say?"
                  />
                )
              ) : null}

              {isNoteCorrection ? (
                selectedField?.value === "Hours" ? (
                  <Controller
                    control={control}
                    name="note"
                    render={({ field }) => (
                      <HoursField
                        onChangeText={field.onChange}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                ) : selectedField?.value === "Menu/prices" ? (
                  <Controller
                    control={control}
                    name="note"
                    render={({ field }) => (
                      <MenuField
                        onChangeText={field.onChange}
                        value={field.value ?? ""}
                      />
                    )}
                  />
                ) : (
                  <ControlledTextArea
                    control={control}
                    inputClassName="min-h-28"
                    label="What should we know?"
                    name="note"
                    placeholder="Tell us what needs attention."
                  />
                )
              ) : null}
            </>
          ) : null}

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
