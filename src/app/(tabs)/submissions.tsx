import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { View } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { toast } from "@/components/ui/toast";
import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { Button, ChipButton } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import {
  ControlledTextArea,
  ControlledTextInput,
  FormTextInput,
} from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ControlledPhoneInput } from "@/components/ui/phone-input";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";
import {
  HoursField,
  MenuField,
  LocationPinField,
  NeighborhoodField,
  PhotoField,
  PlaceNameField,
  useReportMissingPlace,
  type PlaceMissingDetails,
} from "@/features/submissions";
import {
  useAmenities,
  useCuisines,
  usePlaceTypes,
  useTags,
} from "@/features/taxonomy";
import { getErrorMessage } from "@/lib/api";
import { optionalEmailField } from "@/lib/validation";
import { PressableFade } from "@/components/ui/pressable-scale";

const submissionSchema = z
  .object({
    placeName: z.string().trim().min(1, "Place name is required"),
    existingPlaceId: z.string().optional(),
    neighborhoodId: z.string().optional(),
    neighborhood: z.string().trim().optional(),
    near: z.string().trim().max(200).optional(),
    description: z.string().trim().optional(),
    contactPhone: z.string().trim().optional(),
    contactEmail: optionalEmailField,
    type: z.string().optional(),
    hours: z.array(
      z.object({
        day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
        open: z.string(),
        close: z.string(),
      }),
    ),
    menu: z.array(z.object({ name: z.string(), price: z.number().optional() })),
    cuisines: z.array(z.string()),
    tags: z.array(z.string()),
    coords: z.object({ lat: z.number(), lng: z.number() }).nullable(),
    photos: z.array(
      z.object({
        publicId: z.string(),
        url: z.string(),
        width: z.number(),
        height: z.number(),
      }),
    ),
    helpfulDetails: z.array(z.string()),
  })
  .refine((v) => !v.existingPlaceId || Boolean(v.neighborhood?.trim()), {
    message: "Which area is this location in?",
    path: ["neighborhood"],
  });

const EXTRA_SECTIONS = [
  {
    key: "basics",
    title: "Place basics",
    description: "Add the vibe, place type, and cuisines.",
  },
  {
    key: "hoursMenu",
    title: "Hours and menu",
    description: "Add opening times or a few menu prices.",
  },
  {
    key: "locationContact",
    title: "Location and contact",
    description: "Add a map pin, phone number, or email.",
  },
  {
    key: "features",
    title: "Features and tags",
    description: "Add amenities, tags, and useful details.",
  },
] as const;

type ExtraSectionKey = (typeof EXTRA_SECTIONS)[number]["key"];

type SubmissionValues = z.infer<typeof submissionSchema>;

const DEFAULT_VALUES: SubmissionValues = {
  placeName: "",
  existingPlaceId: "",
  neighborhoodId: "",
  neighborhood: "",
  near: "",
  description: "",
  contactPhone: "",
  contactEmail: "",
  type: undefined,
  hours: [],
  menu: [],
  cuisines: [],
  tags: [],
  coords: null,
  photos: [],
  helpfulDetails: [],
};

function SectionToggle({
  description,
  expanded,
  onPress,
  title,
}: {
  description: string;
  expanded: boolean;
  onPress: () => void;
  title: string;
}) {
  const colors = useColors();
  return (
    <PressableFade
      className="flex-row items-center justify-between gap-3 border-t border-border py-4"
      onPress={onPress}
    >
      <View className="flex-1">
        <ThemedText weight="semibold">{title}</ThemedText>
        <ThemedText className="mt-0.5" size="sm" tone="muted">
          {description}
        </ThemedText>
      </View>
      <AppIcon
        color={colors.muted}
        icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
        size={20}
      />
    </PressableFade>
  );
}

export default function SubmissionsScreen() {
  const { isSignedIn } = useAuth();
  const report = useReportMissingPlace();
  const amenities = useAmenities();
  const cuisines = useCuisines();
  // "Other" is the fallback when nothing is picked, so it isn't offered.
  const placeTypes = (usePlaceTypes().data ?? []).filter(
    (t) => t.key !== "other",
  );
  const tags = useTags();

  const [moreOpen, setMoreOpen] = useState(false);
  const [expandedSections, setExpandedSections] = useState<
    Record<ExtraSectionKey, boolean>
  >({
    basics: false,
    hoursMenu: false,
    locationContact: false,
    features: false,
  });

  const { control, handleSubmit, reset, setError, setValue, formState } =
    useForm<SubmissionValues>({
      resolver: zodFormResolver(submissionSchema),
      mode: "onChange",
      defaultValues: DEFAULT_VALUES,
    });

  const existingPlaceId = useWatch({ control, name: "existingPlaceId" });

  // Deep-links: a place's "Add a location" passes placeId (+ name) so this
  // submission becomes a new branch of it (not a duplicate place); a no-results
  // search passes just placeName to prefill a new place. Params are consumed
  // once seeded so re-navigating (even with the same values) works again.
  const { placeId, placeName } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
  }>();
  useEffect(() => {
    if (!placeId && !placeName) return;
    if (placeId) {
      setValue("existingPlaceId", placeId, { shouldValidate: true });
    }
    if (placeName) {
      setValue("placeName", placeName, { shouldValidate: true });
    }
    router.setParams({ placeId: "", placeName: "" });
  }, [placeId, placeName, setValue]);

  const onSubmit = handleSubmit(
    (values) => {
      const details: PlaceMissingDetails = { placeName: values.placeName };
      if (values.existingPlaceId)
        details.existingPlaceId = values.existingPlaceId;
      if (values.neighborhood) details.neighborhood = values.neighborhood;
      if (values.neighborhoodId) details.neighborhoodId = values.neighborhoodId;
      if (values.near) details.near = values.near;
      if (values.description) details.description = values.description;
      if (values.contactPhone) details.contactPhone = values.contactPhone;
      if (values.contactEmail) details.contactEmail = values.contactEmail;
      if (values.type) details.type = values.type;
      if (values.hours.length) details.hours = values.hours;
      if (values.menu.length) details.menu = values.menu;
      if (values.cuisines.length) details.cuisines = values.cuisines;
      if (values.tags.length) details.tags = values.tags;
      if (values.coords) {
        details.latitude = values.coords.lat;
        details.longitude = values.coords.lng;
      }
      if (values.photos.length) details.photos = values.photos;
      if (values.helpfulDetails.length)
        details.amenities = values.helpfulDetails;

      return new Promise<void>((resolve) => {
        report.mutate(
          { details },
          {
            onSuccess: () => {
              reset(DEFAULT_VALUES);
              setExpandedSections({
                basics: false,
                hoursMenu: false,
                locationContact: false,
                features: false,
              });
              toast.success(
                "Tip received",
                "We'll scout it out and add it if it checks out.",
              );
              resolve();
            },
            onError: (err) => {
              setError("root", { message: getErrorMessage(err) });
              resolve();
            },
          },
        );
      });
    },
    (errors) => {
      // A blocking error may live in a collapsed section — open it so the user can
      // see and fix it (otherwise the submit button just looks stuck).
      if (errors.contactEmail || errors.contactPhone) {
        setExpandedSections((current) => ({
          ...current,
          locationContact: true,
        }));
      }
      setError("root", {
        message: "Please fix the highlighted fields before sending.",
      });
    },
  );

  if (!isSignedIn) {
    return (
      <AuthRequiredScreen
        body="Sign in before sending us a place that Bota should know about."
        title="Help grow Bota"
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <KeyboardAwareScrollView
          bottomOffset={24}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-4 px-6"
          contentContainerStyle={{ paddingTop: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="pb-1">
            <ThemedText size="3xl" weight="bold">
              Spotted a gem?
            </ThemedText>
            <ThemedText className="mt-1" tone="muted">
              Just the name is enough. Anything else helps.
            </ThemedText>
          </View>
          <Controller
            control={control}
            name="placeName"
            render={({ field, fieldState }) => (
              <PlaceNameField
                error={fieldState.error?.message}
                existingPlaceId={existingPlaceId || undefined}
                name={field.value}
                onChangeName={field.onChange}
                onSelectPlace={(place) => {
                  if (place) {
                    setValue("placeName", place.name, {
                      shouldValidate: true,
                    });
                    setValue("existingPlaceId", place.id, {
                      shouldValidate: true,
                    });
                  } else {
                    setValue("existingPlaceId", "", { shouldValidate: true });
                  }
                }}
              />
            )}
          />
          <Controller
            control={control}
            name="neighborhood"
            render={({ field, fieldState }) => (
              <NeighborhoodField
                error={fieldState.error?.message}
                onChangeText={field.onChange}
                onMatch={(id) => setValue("neighborhoodId", id ?? "")}
                // Another location of a place is told apart by its area.
                required={Boolean(existingPlaceId)}
                value={field.value ?? ""}
              />
            )}
          />
          <Controller
            control={control}
            name="near"
            render={({ field }) => (
              <FormTextInput
                autoCapitalize="words"
                label="Near (optional)"
                onChangeText={field.onChange}
                placeholder="e.g. Edna Mall, or Cameroon Street"
                value={field.value ?? ""}
              />
            )}
          />

          <Controller
            control={control}
            name="photos"
            render={({ field }) => (
              <PhotoField onChange={field.onChange} value={field.value ?? []} />
            )}
          />

          <View>
            <SectionToggle
              description="Type, hours, menu, location, features"
              expanded={moreOpen}
              onPress={() => setMoreOpen((open) => !open)}
              title="More details (optional)"
            />
            {moreOpen ? (
              <View style={{ paddingLeft: 14 }}>
                {EXTRA_SECTIONS.map((section) => (
                  <View key={section.key}>
                    <SectionToggle
                      description={section.description}
                      expanded={expandedSections[section.key]}
                      onPress={() =>
                        setExpandedSections((current) => ({
                          ...current,
                          [section.key]: !current[section.key],
                        }))
                      }
                      title={section.title}
                    />

                    {section.key === "basics" && expandedSections.basics ? (
                      <View className="gap-4 pb-4">
                        <ControlledTextArea
                          control={control}
                          inputClassName="min-h-28"
                          label="What is it like?"
                          maxLength={500}
                          name="description"
                          placeholder="What kind of place is it? What's good there?"
                          surface="muted"
                        />

                        <View className="gap-2">
                          <ThemedText size="sm" weight="medium">
                            What kind of place?
                          </ThemedText>
                          <Controller
                            control={control}
                            name="type"
                            render={({ field }) => (
                              <View className="flex-row flex-wrap gap-2">
                                {placeTypes.map((option) => (
                                  <ChipButton
                                    key={option.key}
                                    label={option.name}
                                    onPress={() =>
                                      field.onChange(
                                        field.value === option.key
                                          ? undefined
                                          : option.key,
                                      )
                                    }
                                    selected={field.value === option.key}
                                  />
                                ))}
                              </View>
                            )}
                          />
                        </View>

                        {cuisines.data && cuisines.data.length > 0 ? (
                          <View className="gap-2">
                            <ThemedText size="sm" weight="medium">
                              Cuisines
                            </ThemedText>
                            <Controller
                              control={control}
                              name="cuisines"
                              render={({ field }) => (
                                <ChipGroup
                                  onChange={field.onChange}
                                  options={cuisines.data.map((cuisine) => ({
                                    value: cuisine.id,
                                    label: cuisine.name,
                                  }))}
                                  value={field.value}
                                />
                              )}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {section.key === "hoursMenu" &&
                    expandedSections.hoursMenu ? (
                      <View className="gap-4 pb-4">
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
                      </View>
                    ) : null}

                    {section.key === "locationContact" &&
                    expandedSections.locationContact ? (
                      <View className="gap-4 pb-4">
                        <Controller
                          control={control}
                          name="coords"
                          render={({ field }) => (
                            <LocationPinField
                              onChange={field.onChange}
                              value={field.value}
                            />
                          )}
                        />

                        <View className="gap-3">
                          <ControlledPhoneInput
                            control={control}
                            label="Contact phone"
                            name="contactPhone"
                            surface="muted"
                          />
                          <ControlledTextInput
                            autoCapitalize="none"
                            autoComplete="email"
                            control={control}
                            keyboardType="email-address"
                            label="Contact email"
                            name="contactEmail"
                            placeholder="Their email, if you know it"
                            surface="muted"
                          />
                        </View>
                      </View>
                    ) : null}

                    {section.key === "features" && expandedSections.features ? (
                      <View className="gap-4 pb-4">
                        {tags.data && tags.data.length > 0 ? (
                          <View className="gap-2">
                            <ThemedText size="sm" weight="medium">
                              Tags
                            </ThemedText>
                            <Controller
                              control={control}
                              name="tags"
                              render={({ field }) => (
                                <ChipGroup
                                  onChange={field.onChange}
                                  options={tags.data.map((tag) => ({
                                    value: tag.id,
                                    label: tag.name,
                                  }))}
                                  value={field.value}
                                />
                              )}
                            />
                          </View>
                        ) : null}

                        {amenities.data && amenities.data.length > 0 ? (
                          <View className="gap-2">
                            <ThemedText size="sm" weight="medium">
                              Amenities
                            </ThemedText>
                            <Controller
                              control={control}
                              name="helpfulDetails"
                              render={({ field }) => (
                                <ChipGroup
                                  onChange={field.onChange}
                                  options={amenities.data.map((amenity) => ({
                                    value: amenity.id,
                                    label: amenity.name,
                                  }))}
                                  value={field.value}
                                />
                              )}
                            />
                          </View>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : null}
          </View>

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}
        </KeyboardAwareScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={report.isPending}
            label="Send it in"
            loading={report.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
