import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthField } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  NeighborhoodField,
  useReportMissingPlace,
  type PlaceMissingDetails,
} from "@/features/submissions";
import { colors } from "@/lib/theme";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function SubmissionsScreen() {
  const report = useReportMissingPlace();

  const [placeName, setPlaceName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [error, setError] = useState("");

  const canSubmit = placeName.trim().length > 0 && !report.isPending;

  function reset() {
    setPlaceName("");
    setNeighborhood("");
    setDescription("");
    setContactPhone("");
    setContactEmail("");
  }

  function onSubmit() {
    if (!canSubmit) {
      return;
    }

    setError("");

    const details: PlaceMissingDetails = { placeName: placeName.trim() };
    if (neighborhood.trim()) details.neighborhood = neighborhood.trim();
    if (description.trim()) details.description = description.trim();
    if (contactPhone.trim()) details.contactPhone = contactPhone.trim();
    if (contactEmail.trim()) details.contactEmail = contactEmail.trim();

    report.mutate(details, {
      onSuccess: () => {
        reset();
        Alert.alert(
          "Thanks for the tip!",
          "We'll take a look and get it added soon.",
        );
      },
      onError: (err) => setError(getErrorMessage(err)),
    });
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pb-1 pt-2">
        <ThemedText size="3xl" weight="medium">
          Spotted a gem?
        </ThemedText>
        <ThemedText className="mt-1" tone="muted">
          Found a place we&apos;re missing? Help us put it on the map.
        </ThemedText>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-4 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <AuthField
            autoCapitalize="words"
            label="Place name *"
            onChangeText={setPlaceName}
            placeholder="e.g. Tomoca Coffee"
            value={placeName}
          />
          <NeighborhoodField
            onChangeText={setNeighborhood}
            value={neighborhood}
          />

          <View>
            <ThemedText size="sm" weight="medium">
              Description
            </ThemedText>
            <TextInput
              className="mt-2 min-h-28 rounded-2xl bg-surface px-4 py-3 font-outfit text-md text-foreground"
              multiline
              onChangeText={setDescription}
              placeholder="What kind of place is it? What's good there?"
              placeholderTextColor={colors.muted}
              textAlignVertical="top"
              value={description}
            />
          </View>

          <AuthField
            keyboardType="number-pad"
            label="Contact phone (optional)"
            onChangeText={setContactPhone}
            placeholder="Their phone, if you know it"
            value={contactPhone}
          />
          <AuthField
            autoComplete="email"
            keyboardType="email-address"
            label="Contact email (optional)"
            onChangeText={setContactEmail}
            placeholder="Their email, if you know it"
            value={contactEmail}
          />

          {error ? (
            <ThemedText size="sm" tone="brand">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!canSubmit}
            label="Send it in"
            loading={report.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
