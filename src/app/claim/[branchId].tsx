import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { FormTextArea, FormTextInput } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useCreateClaim,
  type ClaimContactRole,
  type CreateClaimBody,
} from "@/features/branch";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

const ROLES: { value: ClaimContactRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "marketing", label: "Marketing" },
];

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
      className={cn(
        "rounded-full px-4 py-2",
        selected ? "bg-black" : "bg-surface",
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

export default function ClaimBusinessScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const claim = useCreateClaim(branchId);

  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState<ClaimContactRole>("owner");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const emailLooksValid = /\S+@\S+\.\S+/.test(contactEmail.trim());
  const canSubmit =
    !claim.isPending &&
    contactName.trim().length > 0 &&
    contactPhone.trim().length > 0 &&
    emailLooksValid;

  function onSubmit() {
    if (!canSubmit) return;
    setError("");

    const body: CreateClaimBody = {
      contactName: contactName.trim(),
      contactRole,
      contactPhone: contactPhone.trim(),
      contactEmail: contactEmail.trim(),
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    claim.mutate(body, {
      onSuccess: () => {
        Alert.alert(
          "Claim submitted",
          "Thanks — we'll verify your ownership and get back to you.",
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
          Claim this business
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
              Claiming <ThemedText weight="medium">{name}</ThemedText>
            </ThemedText>
          ) : null}

          <ThemedText tone="muted" size="sm">
            Tell us how to reach you. We&apos;ll verify your connection to this
            business before granting access.
          </ThemedText>

          <FormTextInput
            label="Your name"
            onChangeText={setContactName}
            placeholder="Full name"
            value={contactName}
          />

          <View className="gap-2">
            <ThemedText size="sm" weight="medium">
              Your role
            </ThemedText>
            <View className="flex-row flex-wrap gap-2">
              {ROLES.map((role) => (
                <Pill
                  key={role.value}
                  label={role.label}
                  onPress={() => setContactRole(role.value)}
                  selected={contactRole === role.value}
                />
              ))}
            </View>
          </View>

          <FormTextInput
            keyboardType="phone-pad"
            label="Phone"
            onChangeText={setContactPhone}
            placeholder="Where we can reach you"
            value={contactPhone}
          />

          <FormTextInput
            autoCapitalize="none"
            keyboardType="email-address"
            label="Email"
            onChangeText={setContactEmail}
            placeholder="you@business.com"
            value={contactEmail}
          />

          <FormTextArea
            label="Note (optional)"
            onChangeText={setNote}
            placeholder="Anything that helps us verify you own or manage this place."
            value={note}
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
            label="Submit claim"
            loading={claim.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
