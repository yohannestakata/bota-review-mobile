import { zodFormResolver } from "@/lib/zod-resolver";
import {
  CheckmarkBadge01Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { Controller, useForm } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { ControlledTextArea, ControlledTextInput } from "@/components/ui/form-field";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useCreateClaim,
  useOwnClaims,
  type CreateClaimBody,
} from "@/features/branch";
import { analytics } from "@/lib/analytics";
import { getErrorCode } from "@/lib/api";
import { cn } from "@/lib/cn";
import { useDiscardConfirm } from "@/lib/use-discard-confirm";
import { colors } from "@/lib/theme";
import { emailField } from "@/lib/validation";

const ROLES = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "marketing", label: "Marketing" },
] as const;

const claimSchema = z.object({
  contactName: z.string().trim().min(1, "Your name is required"),
  contactRole: z.enum(["owner", "manager", "marketing"]),
  contactPhone: z.string().trim().min(1, "Phone is required"),
  contactEmail: emailField,
  note: z.string().trim().optional(),
});

type ClaimValues = z.infer<typeof claimSchema>;

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
        selected ? "bg-primary" : "bg-surface",
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

function ScreenHeader({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <CloseButton onPress={onClose ?? (() => router.back())} />
      <ThemedText size="lg" weight="semibold">
        {title}
      </ThemedText>
      <View className="w-6" />
    </View>
  );
}

function ClaimStatusScreen({
  verified,
}: {
  verified: boolean;
}) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenHeader title={verified ? "You're verified" : "Your claim"} />
      <View className="flex-1 items-center justify-center gap-3 px-8">
        <AppIcon
          color={verified ? colors.success : colors.muted}
          icon={verified ? CheckmarkBadge01Icon : Clock01Icon}
          size={40}
        />
        <ThemedText size="lg" weight="semibold">
          {verified ? "You own this listing" : "Claim under review"}
        </ThemedText>
        <ThemedText className="text-center" tone="muted">
          {verified
            ? "You're verified as the owner of this listing."
            : "Your claim is being reviewed. We'll contact you to verify your ownership."}
        </ThemedText>
        <Pressable className="mt-2" onPress={() => router.back()}>
          <ThemedText tone="brand" weight="semibold">
            Done
          </ThemedText>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

export default function ClaimBusinessScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const claim = useCreateClaim(branchId);
  const ownClaims = useOwnClaims();
  // An existing pending/verified claim by this user blocks a new submission.
  const existingClaim = ownClaims.data?.find(
    (c) => c.branchId === branchId && c.status !== "rejected",
  );

  const { control, handleSubmit, setError, formState } = useForm<ClaimValues>({
    resolver: zodFormResolver(claimSchema),
    mode: "onChange",
    defaultValues: {
      contactName: "",
      contactRole: "owner",
      contactPhone: "",
      contactEmail: "",
      note: "",
    },
  });

  const onSubmit = handleSubmit((values) => {
    const body: CreateClaimBody = {
      contactName: values.contactName,
      contactRole: values.contactRole,
      contactPhone: values.contactPhone,
      contactEmail: values.contactEmail,
      ...(values.note ? { note: values.note } : {}),
    };

    return new Promise<void>((resolve) => {
      claim.mutate(body, {
        onSuccess: () => {
          analytics.track("claim_submitted", { branch_id: branchId });
          Alert.alert(
            "Claim submitted",
            "Thanks — we'll verify your ownership and get back to you.",
          );
          router.back();
          resolve();
        },
        onError: (err) => {
          const message =
            getErrorCode(err) === "CLAIM_ALREADY_PENDING"
              ? "A claim for this business is already being reviewed."
              : getErrorMessage(err);
          setError("root", { message });
          resolve();
        },
      });
    });
  });

  const attemptClose = useDiscardConfirm(formState.isDirty);

  // Pre-check: don't show the form until we know the user's existing claims,
  // and show a status screen instead of the form when one already exists.
  if (ownClaims.isPending) {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <ScreenHeader title="Claim this business" />
        <View className="flex-1 items-center justify-center px-6">
          <ThemedText tone="muted">Checking your claims…</ThemedText>
        </View>
      </SafeAreaView>
    );
  }

  if (existingClaim) {
    return <ClaimStatusScreen verified={existingClaim.status === "verified"} />;
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenHeader onClose={attemptClose} title="Claim this business" />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
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

          <ControlledTextInput
            control={control}
            label="Your name"
            name="contactName"
            placeholder="Full name"
          />

          <View className="gap-2">
            <ThemedText size="sm" weight="medium">
              Your role
            </ThemedText>
            <Controller
              control={control}
              name="contactRole"
              render={({ field }) => (
                <View className="flex-row flex-wrap gap-2">
                  {ROLES.map((role) => (
                    <Pill
                      key={role.value}
                      label={role.label}
                      onPress={() => field.onChange(role.value)}
                      selected={field.value === role.value}
                    />
                  ))}
                </View>
              )}
            />
          </View>

          <ControlledTextInput
            control={control}
            keyboardType="phone-pad"
            label="Phone"
            name="contactPhone"
            placeholder="Where we can reach you"
          />

          <ControlledTextInput
            autoCapitalize="none"
            control={control}
            keyboardType="email-address"
            label="Email"
            name="contactEmail"
            placeholder="you@business.com"
          />

          <ControlledTextArea
            control={control}
            label="Note (optional)"
            name="note"
            placeholder="Anything that helps us verify you own or manage this place."
          />

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={!formState.isValid || claim.isPending}
            label="Submit claim"
            loading={claim.isPending}
            onPress={onSubmit}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
