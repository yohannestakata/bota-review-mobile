import { useClerk, useUser } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { View } from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardAwareScrollView,
} from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScreenHeader } from "@/components/ui/screen-header";
import { ControlledTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import { getAuthMessage } from "@/lib/auth";
import { useDiscardConfirm } from "@/lib/use-discard-confirm";
import { openLegal, PRIVACY_POLICY_URL, TERMS_URL } from "@/lib/legal";
import { usePickImage } from "@/lib/use-pick-image";
import { PressableFade } from "@/components/ui/pressable-scale";

const editProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  username: z.string().trim().min(3, "At least 3 characters"),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const pickImage = usePickImage();

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  function onDeleteAccount() {
    Alert.alert(
      "Delete account",
      "This permanently deletes your account, reviews, and replies. This can't be undone.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: confirmDeleteAccount },
      ],
    );
  }

  async function confirmDeleteAccount() {
    if (!user || deleting) return;
    setDeleting(true);
    try {
      await user.delete();
      await signOut();
      router.replace("/login");
    } catch (err) {
      setDeleting(false);
      toast.error("Couldn't delete account", getAuthMessage(err));
    }
  }

  const { control, handleSubmit, setError, setFocus, formState } =
    useForm<EditProfileValues>({
      resolver: zodFormResolver(editProfileSchema),
      defaultValues: {
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        username: user?.username ?? "",
      },
    });

  const attemptClose = useDiscardConfirm(
    formState.isDirty || avatarUri !== null,
  );

  async function pickAvatar() {
    const result = await pickImage({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      quality: 0.7,
    });
    if (result.status === "denied") {
      Alert.alert(
        "Photo access needed",
        "Turn it on in Settings to choose a new profile photo.",
      );
      return;
    }
    if (result.status !== "picked") return;
    const image = result.images[0];
    if (!image) return;

    setAvatarUri(image.uri);
    if (image.base64) {
      setAvatarData(
        `data:${image.mimeType ?? "image/jpeg"};base64,${image.base64}`,
      );
    }
  }

  const onSave = handleSubmit(async (values) => {
    if (!user) {
      return;
    }

    try {
      if (avatarData) {
        await user.setProfileImage({ file: avatarData });
      }
      await user.update({
        firstName: values.firstName ?? "",
        lastName: values.lastName ?? "",
        username: values.username,
      });
      router.back();
    } catch (err) {
      setError("root", { message: getAuthMessage(err) });
    }
  });

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScreenHeader onClose={attemptClose} title="Edit profile" />

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <KeyboardAwareScrollView
          bottomOffset={24}
          showsVerticalScrollIndicator={false}
          className="flex-1"
          contentContainerClassName="gap-5 px-6 pt-4"
          keyboardShouldPersistTaps="handled"
        >
          <View className="items-center gap-3">
            <Avatar
              name={user?.fullName}
              size={96}
              uri={avatarUri ?? user?.imageUrl}
            />
            <PressableFade hitSlop={8} onPress={pickAvatar}>
              <ThemedText tone="brand" weight="semibold">
                Change photo
              </ThemedText>
            </PressableFade>
          </View>

          <ControlledTextInput
            autoCapitalize="words"
            autoComplete="given-name"
            control={control}
            label="First name"
            name="firstName"
            onSubmitEditing={() => setFocus("lastName")}
            placeholder="First name"
            returnKeyType="next"
            submitBehavior="submit"
          />
          <ControlledTextInput
            autoCapitalize="words"
            autoComplete="family-name"
            control={control}
            label="Last name"
            name="lastName"
            onSubmitEditing={() => setFocus("username")}
            placeholder="Last name"
            returnKeyType="next"
            submitBehavior="submit"
          />
          <ControlledTextInput
            autoCapitalize="none"
            autoComplete="username"
            autoCorrect={false}
            control={control}
            label="Username"
            name="username"
            placeholder="yourname"
            returnKeyType="done"
          />

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}

          <View className="mt-2 gap-3 border-t border-border pt-5">
            <PressableFade
              hitSlop={6}
              onPress={() => openLegal(PRIVACY_POLICY_URL)}
            >
              <ThemedText weight="medium">Privacy Policy</ThemedText>
            </PressableFade>
            <PressableFade hitSlop={6} onPress={() => openLegal(TERMS_URL)}>
              <ThemedText weight="medium">Terms of Service</ThemedText>
            </PressableFade>
            <PressableFade
              disabled={deleting}
              hitSlop={6}
              onPress={onDeleteAccount}
            >
              <ThemedText tone="danger" weight="medium">
                {deleting ? "Deleting account…" : "Delete account"}
              </ThemedText>
            </PressableFade>
          </View>
        </KeyboardAwareScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={formState.isSubmitting || deleting}
            label="Save"
            loading={formState.isSubmitting}
            onPress={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
