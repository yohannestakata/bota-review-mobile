import { zodFormResolver } from "@/lib/zod-resolver";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm, useWatch } from "react-hook-form";
import { ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button, ChipButton } from "@/components/ui/button";
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
  PhotoField,
  useAmenities,
  useCreateBranchSubmission,
  useTags,
  type BranchSubmissionBody,
} from "@/features/submissions";
import { useBranch } from "@/features/branch/queries";
import { analytics } from "@/lib/analytics";
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
  hours: z.array(
    z.object({
      day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
      open: z.string(),
      close: z.string(),
    }),
  ),
  menu: z.array(z.object({ name: z.string(), price: z.number().optional() })),
  tags: z.array(z.string()),
  amenities: z.array(z.string()),
  photos: z.array(
    z.object({
      publicId: z.string(),
      url: z.string(),
      width: z.number(),
      height: z.number(),
    }),
  ),
  reportedPhotoId: z.string(),
});

type SuggestEditValues = z.infer<typeof suggestEditObject>;

const DEFAULT_VALUES: SuggestEditValues = {
  kind: "field_correction",
  fieldName: "",
  suggestedValue: "",
  note: "",
  hours: [],
  menu: [],
  tags: [],
  amenities: [],
  photos: [],
  reportedPhotoId: "",
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

export default function SuggestEditScreen() {
  const { branchId, name, photoId, photoUrl } = useLocalSearchParams<{
    branchId: string;
    name?: string;
    photoId?: string;
    photoUrl?: string;
  }>();
  const submit = useCreateBranchSubmission(branchId);
  const branch = useBranch(branchId);
  const tagsQuery = useTags();
  const amenitiesQuery = useAmenities();

  const { control, handleSubmit, setError, setValue, formState } =
    useForm<SuggestEditValues>({
      resolver: zodFormResolver(suggestEditSchema),
      mode: "onChange",
      defaultValues: {
        ...DEFAULT_VALUES,
        fieldName: photoId ? "Photos" : "",
        reportedPhotoId: photoId ?? "",
      },
    });

  const attemptClose = useDiscardConfirm(formState.isDirty);

  const values = useWatch({ control }) as SuggestEditValues;
  const isCorrection = values.kind === "field_correction";
  const selectedField = FIELDS.find(
    (field) => field.value === values.fieldName,
  );
  const isValueCorrection = isCorrection && selectedField?.mode === "value";
  const isNoteCorrection = isCorrection && selectedField?.mode === "note";
  const isHoursField = selectedField?.value === "Hours";
  const isMenuField = selectedField?.value === "Menu/prices";
  const isTagsField = selectedField?.value === "Tags/amenities";
  const isPhotosField = selectedField?.value === "Photos";
  const isPhotoReport = isPhotosField && Boolean(values.reportedPhotoId);

  const hasPrimaryCorrection = isValueCorrection
    ? values.suggestedValue.trim().length > 0
    : isHoursField
      ? values.hours.length > 0
      : isMenuField
        ? values.menu.length > 0
        : isTagsField
          ? values.tags.length > 0 || values.amenities.length > 0
          : isPhotosField
            ? isPhotoReport
              ? values.note.trim().length > 0
              : values.photos.length > 0
            : values.note.trim().length > 0;
  const canSubmit =
    !submit.isPending &&
    (!isCorrection || (Boolean(values.fieldName) && hasPrimaryCorrection));

  function resetPrimaryFields() {
    setValue("suggestedValue", "");
    setValue("note", "");
    setValue("hours", []);
    setValue("menu", []);
    setValue("tags", []);
    setValue("amenities", []);
    setValue("photos", []);
    setValue("reportedPhotoId", "");
  }

  function resetContributionFields() {
    resetPrimaryFields();
  }

  const onSubmit = handleSubmit((formValues) => {
    const correctionValue = isValueCorrection
      ? formValues.suggestedValue.trim()
      : "";
    const noteValue = submissionNote(formValues);

    const structuredDetails =
      formValues.fieldName === "Hours" && formValues.hours.length
        ? { hours: formValues.hours }
        : formValues.fieldName === "Menu/prices" && formValues.menu.length
          ? { menu: formValues.menu }
          : formValues.fieldName === "Tags/amenities"
            ? { tags: formValues.tags, amenities: formValues.amenities }
            : formValues.fieldName === "Photos" && formValues.reportedPhotoId
              ? {
                  reportedPhotoId: formValues.reportedPhotoId,
                  ...(photoUrl ? { reportedPhotoUrl: photoUrl } : {}),
                }
              : formValues.fieldName === "Photos" && formValues.photos.length
                ? { photos: formValues.photos }
                : undefined;

    const body: BranchSubmissionBody =
      formValues.kind === "field_correction"
        ? {
            type: "field_correction",
            fieldName: formValues.fieldName || LISTING_DETAILS_FIELD,
            ...(correctionValue ? { suggestedValue: correctionValue } : {}),
            ...(noteValue ? { note: noteValue } : {}),
            ...(structuredDetails ? { details: structuredDetails } : {}),
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
              <ChipButton
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
                    <ChipButton
                      key={field.value}
                      label={field.label}
                      onPress={() => {
                        setValue("fieldName", field.value, {
                          shouldValidate: true,
                        });
                        resetPrimaryFields();
                        // Seed the pickers with the branch's current set so a
                        // correction edits reality (approve replaces the set).
                        if (field.value === "Tags/amenities") {
                          setValue(
                            "tags",
                            (branch.data?.tags ?? []).map((tag) => tag.slug),
                            { shouldValidate: true },
                          );
                          setValue(
                            "amenities",
                            (branch.data?.amenities ?? []).map(
                              (amenity) => amenity.slug,
                            ),
                            { shouldValidate: true },
                          );
                        }
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
                    name="hours"
                    render={({ field }) => (
                      <HoursField
                        onChange={field.onChange}
                        value={field.value ?? []}
                      />
                    )}
                  />
                ) : selectedField?.value === "Menu/prices" ? (
                  <Controller
                    control={control}
                    name="menu"
                    render={({ field }) => (
                      <MenuField
                        onChange={field.onChange}
                        value={field.value ?? []}
                      />
                    )}
                  />
                ) : selectedField?.value === "Tags/amenities" ? (
                  <View className="gap-4">
                    {tagsQuery.data && tagsQuery.data.length > 0 ? (
                      <View className="gap-2">
                        <ThemedText size="sm" weight="medium">
                          Tags
                        </ThemedText>
                        <Controller
                          control={control}
                          name="tags"
                          render={({ field }) => (
                            <View className="flex-row flex-wrap gap-2">
                              {tagsQuery.data.map((tag) => (
                                <ChipButton
                                  key={tag.slug}
                                  label={tag.name}
                                  onPress={() =>
                                    field.onChange(
                                      field.value.includes(tag.slug)
                                        ? field.value.filter(
                                            (item) => item !== tag.slug,
                                          )
                                        : [...field.value, tag.slug],
                                    )
                                  }
                                  selected={field.value.includes(tag.slug)}
                                />
                              ))}
                            </View>
                          )}
                        />
                      </View>
                    ) : null}
                    {amenitiesQuery.data && amenitiesQuery.data.length > 0 ? (
                      <View className="gap-2">
                        <ThemedText size="sm" weight="medium">
                          Amenities
                        </ThemedText>
                        <Controller
                          control={control}
                          name="amenities"
                          render={({ field }) => (
                            <View className="flex-row flex-wrap gap-2">
                              {amenitiesQuery.data.map((amenity) => (
                                <ChipButton
                                  key={amenity.slug}
                                  label={amenity.name}
                                  onPress={() =>
                                    field.onChange(
                                      field.value.includes(amenity.slug)
                                        ? field.value.filter(
                                            (item) => item !== amenity.slug,
                                          )
                                        : [...field.value, amenity.slug],
                                    )
                                  }
                                  selected={field.value.includes(amenity.slug)}
                                />
                              ))}
                            </View>
                          )}
                        />
                      </View>
                    ) : null}
                  </View>
                ) : selectedField?.value === "Photos" ? (
                  isPhotoReport ? (
                    <View className="gap-4">
                      {photoUrl ? (
                        <Image
                          contentFit="cover"
                          source={photoUrl}
                          style={{
                            width: "100%",
                            aspectRatio: 1,
                            borderRadius: 16,
                          }}
                          transition={150}
                        />
                      ) : null}
                      <ControlledTextArea
                        control={control}
                        inputClassName="min-h-28"
                        label="What's wrong with this photo?"
                        name="note"
                        placeholder="Tell us why it should come down."
                      />
                    </View>
                  ) : (
                    <View className="gap-4">
                      <Controller
                        control={control}
                        name="photos"
                        render={({ field }) => (
                          <PhotoField
                            onChange={field.onChange}
                            value={field.value ?? []}
                          />
                        )}
                      />
                      <ControlledTextArea
                        control={control}
                        label="A quick note (optional)"
                        name="note"
                        placeholder="What do these photos show?"
                      />
                    </View>
                  )
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
