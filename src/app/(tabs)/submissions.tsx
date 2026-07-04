import { ArrowDown01Icon, ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
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
  NeighborhoodField,
  useAmenities,
  useReportMissingPlace,
  type PlaceMissingDetails,
} from "@/features/submissions";
import { cn } from "@/lib/cn";
import { optionalEmailField } from "@/lib/validation";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

const submissionSchema = z.object({
  placeName: z.string().trim().min(1, "Place name is required"),
  neighborhood: z.string().trim().optional(),
  description: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: optionalEmailField,
  hours: z.array(
    z.object({
      day: z.enum(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]),
      open: z.string(),
      close: z.string(),
    }),
  ),
  menu: z.array(z.object({ name: z.string(), price: z.number().optional() })),
  helpfulDetails: z.array(z.string()),
});

type SubmissionValues = z.infer<typeof submissionSchema>;

const DEFAULT_VALUES: SubmissionValues = {
  placeName: "",
  neighborhood: "",
  description: "",
  contactPhone: "",
  contactEmail: "",
  hours: [],
  menu: [],
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

  const [helpMore, setHelpMore] = useState(false);

  const { control, handleSubmit, reset, setError, formState } =
    useForm<SubmissionValues>({
      resolver: zodFormResolver(submissionSchema),
      mode: "onChange",
      defaultValues: DEFAULT_VALUES,
    });

  const onSubmit = handleSubmit((values) => {
    const details: PlaceMissingDetails = { placeName: values.placeName };
    if (values.neighborhood) details.neighborhood = values.neighborhood;
    if (values.description) details.description = values.description;
    if (values.contactPhone) details.contactPhone = values.contactPhone;
    if (values.contactEmail) details.contactEmail = values.contactEmail;
    if (values.hours.length) details.hours = values.hours;
    if (values.menu.length) details.menu = values.menu;
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
          <ControlledTextInput
            autoCapitalize="words"
            control={control}
            label="Place name *"
            name="placeName"
            placeholder="e.g. Tomoca Coffee"
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
