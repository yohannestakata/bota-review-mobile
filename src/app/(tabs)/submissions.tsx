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
import { OptionalDetailsPanel } from "@/components/ui/optional-details-panel";
import { ThemedText } from "@/components/ui/themed-text";
import {
  NeighborhoodField,
  useReportMissingPlace,
  type PlaceMissingDetails,
} from "@/features/submissions";
import { cn } from "@/lib/cn";
import { optionalEmailField } from "@/lib/validation";

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

const submissionSchema = z.object({
  placeName: z.string().trim().min(1, "Place name is required"),
  neighborhood: z.string().trim().optional(),
  description: z.string().trim().optional(),
  contactPhone: z.string().trim().optional(),
  contactEmail: optionalEmailField,
  priceLevel: z.string(),
  hours: z.string().trim().optional(),
  menu: z.string().trim().optional(),
  amenities: z.array(z.string()),
});

type SubmissionValues = z.infer<typeof submissionSchema>;

const DEFAULT_VALUES: SubmissionValues = {
  placeName: "",
  neighborhood: "",
  description: "",
  contactPhone: "",
  contactEmail: "",
  priceLevel: "",
  hours: "",
  menu: "",
  amenities: [],
};

function extraDetailsNote(values: SubmissionValues) {
  const lines: string[] = [];
  if (values.priceLevel) {
    lines.push(`Price range: ${"$".repeat(Number(values.priceLevel))}`);
  }
  if (values.hours?.trim()) lines.push(`Hours: ${values.hours.trim()}`);
  if (values.menu?.trim()) lines.push(`Menu/prices: ${values.menu.trim()}`);
  if (values.amenities.length > 0) {
    lines.push(`Amenities: ${values.amenities.join(", ")}`);
  }

  return lines.length > 0
    ? `Help complete this missing place:\n${lines.join("\n")}`
    : "";
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

export default function SubmissionsScreen() {
  const { isSignedIn } = useAuth();
  const report = useReportMissingPlace();

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

    const note = extraDetailsNote(values);
    if (note.length > SUBMISSION_NOTE_LIMIT) {
      setError("root", {
        message: "Keep optional details under 500 characters total.",
      });
      return;
    }

    return new Promise<void>((resolve) => {
      report.mutate(
        { details, ...(note ? { note } : {}) },
        {
          onSuccess: () => {
            reset(DEFAULT_VALUES);
            setHelpMore(false);
            Alert.alert(
              "Thanks for the tip!",
              "We'll take a look and get it added soon.",
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
        <ThemedText size="3xl" weight="medium">
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

          <OptionalDetailsPanel
            expanded={helpMore}
            onToggle={() => setHelpMore((value) => !value)}
            subtitle="Add details only if they're handy."
            title="Know a little more?"
          >
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
                Price range
              </ThemedText>
              <Controller
                control={control}
                name="priceLevel"
                render={({ field }) => (
                  <View className="flex-row flex-wrap gap-2">
                    {PRICE_LEVELS.map((level) => (
                      <Pill
                        key={level.value}
                        label={level.label}
                        onPress={() =>
                          field.onChange(
                            field.value === level.value ? "" : level.value,
                          )
                        }
                        selected={field.value === level.value}
                        surface="muted"
                      />
                    ))}
                  </View>
                )}
              />
            </View>

            <ControlledTextArea
              control={control}
              inputClassName="min-h-20"
              label="Hours"
              name="hours"
              placeholder="e.g. Open late on weekends."
              surface="muted"
            />

            <ControlledTextArea
              control={control}
              inputClassName="min-h-20"
              label="Menu or prices"
              name="menu"
              placeholder="e.g. Great breakfast, juice is around 120 birr."
              surface="muted"
            />

            <View className="gap-3">
              <ControlledTextInput
                control={control}
                keyboardType="number-pad"
                label="Contact phone"
                maxLength={60}
                name="contactPhone"
                placeholder="Their phone, if you know it"
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

            <View className="gap-2">
              <ThemedText size="sm" weight="medium">
                Amenities
              </ThemedText>
              <Controller
                control={control}
                name="amenities"
                render={({ field }) => (
                  <View className="flex-row flex-wrap gap-2">
                    {AMENITIES.map((amenity) => (
                      <Pill
                        key={amenity}
                        label={amenity}
                        onPress={() =>
                          field.onChange(
                            field.value.includes(amenity)
                              ? field.value.filter((item) => item !== amenity)
                              : [...field.value, amenity],
                          )
                        }
                        selected={field.value.includes(amenity)}
                        surface="muted"
                      />
                    ))}
                  </View>
                )}
              />
            </View>
          </OptionalDetailsPanel>

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
