import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { Button } from "@/components/ui/button";
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
  useAmenities,
  useCuisines,
  useReportMissingPlace,
  useTags,
  type PlaceMissingDetails,
} from "@/features/submissions";
import { cn } from "@/lib/cn";
import { optionalEmailField } from "@/lib/validation";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

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

const PLACE_TYPES: { value: "restaurant" | "cafe" | "bakery" | "bar"; label: string }[] =
  [
    { value: "restaurant", label: "Restaurant" },
    { value: "cafe", label: "Café" },
    { value: "bakery", label: "Bakery" },
    { value: "bar", label: "Bar" },
  ];

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

export default function SubmissionsScreen() {
  const { isSignedIn } = useAuth();
  const report = useReportMissingPlace();
  const amenities = useAmenities();
  const cuisines = useCuisines();
  const tags = useTags();

  const [helpMore, setHelpMore] = useState(false);

  const { control, handleSubmit, reset, setError, setValue, formState } =
    useForm<SubmissionValues>({
      resolver: zodFormResolver(submissionSchema),
      mode: "onChange",
      defaultValues: DEFAULT_VALUES,
    });

  const existingPlaceId = useWatch({ control, name: "existingPlaceId" });

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
            setHelpMore(false);
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

          <View className="mt-2 border-t border-border pt-5">
            <Pressable
              className="flex-row items-center justify-between gap-3"
              onPress={() => setHelpMore((value) => !value)}
            >
              <View className="flex-1">
                <ThemedText weight="semibold">Know a little more?</ThemedText>
                <ThemedText className="mt-0.5" size="sm" tone="muted">
                  Add details only if they're handy.
                </ThemedText>
              </View>
              <AppIcon
                color={colors.muted}
                icon={helpMore ? ArrowUp01Icon : ArrowDown01Icon}
                size={20}
              />
            </Pressable>
          </View>

          {helpMore ? (
            <View className="gap-4">
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
                        <Pill
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
                          surface="muted"
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
                      <View className="flex-row flex-wrap gap-2">
                        {cuisines.data.map((cuisine) => (
                          <Pill
                            key={cuisine.slug}
                            label={cuisine.name}
                            onPress={() =>
                              field.onChange(
                                field.value.includes(cuisine.slug)
                                  ? field.value.filter(
                                      (item) => item !== cuisine.slug,
                                    )
                                  : [...field.value, cuisine.slug],
                              )
                            }
                            selected={field.value.includes(cuisine.slug)}
                            surface="muted"
                          />
                        ))}
                      </View>
                    )}
                  />
                </View>
              ) : null}

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
                  <MenuField onChange={field.onChange} value={field.value ?? []} />
                )}
              />

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

              {tags.data && tags.data.length > 0 ? (
                <View className="gap-2">
                  <ThemedText size="sm" weight="medium">
                    Tags
                  </ThemedText>
                  <Controller
                    control={control}
                    name="tags"
                    render={({ field }) => (
                      <View className="flex-row flex-wrap gap-2">
                        {tags.data.map((tag) => (
                          <Pill
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
                            surface="muted"
                          />
                        ))}
                      </View>
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
                      <View className="flex-row flex-wrap gap-2">
                        {amenities.data.map((amenity) => (
                          <Pill
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
                            surface="muted"
                          />
                        ))}
                      </View>
                    )}
                  />
                </View>
              ) : null}
            </View>
          ) : null}

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!formState.isValid || report.isPending}
            label="Send it in"
            loading={report.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
