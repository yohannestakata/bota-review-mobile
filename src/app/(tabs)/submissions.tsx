import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { Button, ChipButton } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import {
  ControlledTextArea,
  ControlledTextInput,
} from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ControlledPhoneInput } from "@/components/ui/phone-input";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";
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
import { useAmenities, useCuisines, useTags } from "@/features/taxonomy";
import { getErrorMessage } from "@/lib/api";
import { optionalEmailField } from "@/lib/validation";

const submissionSchema = z.object({
  placeName: z.string().trim().min(1, "Place name is required"),
  existingPlaceId: z.string().optional(),
  neighborhood: z.string().trim().optional(),
  description: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: optionalEmailField,
  type: z.enum(["restaurant", "cafe", "bakery", "bar"]).optional(),
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
});

const PLACE_TYPES: {
  value: "restaurant" | "cafe" | "bakery" | "bar";
  label: string;
}[] = [
  { value: "restaurant", label: "Restaurant" },
  { value: "cafe", label: "Café" },
  { value: "bakery", label: "Bakery" },
  { value: "bar", label: "Bar" },
];

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
  neighborhood: "",
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
  return (
    <Pressable
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
    </Pressable>
  );
}

export default function SubmissionsScreen() {
  const { isSignedIn } = useAuth();
  const report = useReportMissingPlace();
  const amenities = useAmenities();
  const cuisines = useCuisines();
  const tags = useTags();

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

  // Deep-link from a place's "Add a location" — preselect the place so this
  // submission becomes a new branch of it (not a duplicate place). The param is
  // consumed once seeded so re-navigating (even to the same place) works again.
  const { placeId, placeName } = useLocalSearchParams<{
    placeId?: string;
    placeName?: string;
  }>();
  useEffect(() => {
    if (!placeId) return;
    setValue("existingPlaceId", placeId, { shouldValidate: true });
    if (placeName) {
      setValue("placeName", placeName, { shouldValidate: true });
    }
    router.setParams({ placeId: "", placeName: "" });
  }, [placeId, placeName, setValue]);

  const onSubmit = handleSubmit((values) => {
    const details: PlaceMissingDetails = { placeName: values.placeName };
    if (values.existingPlaceId)
      details.existingPlaceId = values.existingPlaceId;
    if (values.neighborhood) details.neighborhood = values.neighborhood;
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
    if (values.helpfulDetails.length) details.amenities = values.helpfulDetails;

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
            Alert.alert(
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
  }, (errors) => {
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
  });

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
      <View className="px-6 pb-1 pt-2">
        <ThemedText size="3xl" weight="bold">
          Spotted a gem?
        </ThemedText>
        <ThemedText className="mt-1" tone="muted">
          Place name is enough. Add the area or details only if you know them.
        </ThemedText>
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
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
            render={({ field }) => (
              <NeighborhoodField
                onChangeText={field.onChange}
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

          <View className="mt-2 gap-1">
            <ThemedText weight="semibold">Know a little more?</ThemedText>
            <ThemedText size="sm" tone="muted">
              Add details only if they are handy.
            </ThemedText>
          </View>

          <View>
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
                            {PLACE_TYPES.map((option) => (
                              <ChipButton
                                key={option.value}
                                label={option.label}
                                onPress={() =>
                                  field.onChange(
                                    field.value === option.value
                                      ? undefined
                                      : option.value,
                                  )
                                }
                                selected={field.value === option.value}
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
                                value: cuisine.slug,
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

                {section.key === "hoursMenu" && expandedSections.hoursMenu ? (
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
                                value: tag.slug,
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
                                value: amenity.slug,
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

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}
        </ScrollView>

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
