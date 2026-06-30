import { useClerk, useUser } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Pressable, ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";
import { z } from "zod";

import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { CloseButton } from "@/components/ui/close-button";
import { ControlledTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import { getAuthMessage } from "@/lib/auth";
import { openLegal, PRIVACY_POLICY_URL, TERMS_URL } from "@/lib/legal";

const editProfileSchema = z.object({
  firstName: z.string().trim().optional(),
  lastName: z.string().trim().optional(),
  username: z.string().trim().min(3, "At least 3 characters"),
});

type EditProfileValues = z.infer<typeof editProfileSchema>;

export default function EditProfileScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();

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
      Alert.alert("Couldn't delete account", getAuthMessage(err));
    }
  }

  const { control, handleSubmit, setError, formState } =
    useForm<EditProfileValues>({
      resolver: zodFormResolver(editProfileSchema),
      defaultValues: {
        firstName: user?.firstName ?? "",
        lastName: user?.lastName ?? "",
        username: user?.username ?? "",
      },
    });

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
      mediaTypes: ["images"],
      quality: 0.7,
    });

    if (!result.canceled) {
      const asset = result.assets[0];
      setAvatarUri(asset.uri);
      if (asset.base64) {
        setAvatarData(
          `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`,
        );
      }
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
      <View className="flex-row items-center justify-between px-4 py-3">
        <CloseButton onPress={() => router.back()} />
        <ThemedText size="lg" weight="semibold">
          Edit profile
        </ThemedText>
        <View className="w-6" />
      </View>

      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
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
            <Pressable hitSlop={8} onPress={pickAvatar}>
              <ThemedText tone="brand" weight="semibold">
                Change photo
              </ThemedText>
            </Pressable>
          </View>

          <ControlledTextInput
            autoCapitalize="words"
            control={control}
            label="First name"
            name="firstName"
            placeholder="First name"
          />
          <ControlledTextInput
            autoCapitalize="words"
            control={control}
            label="Last name"
            name="lastName"
            placeholder="Last name"
          />
          <ControlledTextInput
            autoCapitalize="none"
            autoComplete="username"
            control={control}
            label="Username"
            name="username"
            placeholder="yourname"
          />

          {formState.errors.root ? (
            <ThemedText size="sm" tone="danger">
              {formState.errors.root.message}
            </ThemedText>
          ) : null}

          <View className="mt-2 gap-3 border-t border-border pt-5">
            <Pressable
              hitSlop={6}
              onPress={() => openLegal(PRIVACY_POLICY_URL)}
            >
              <ThemedText weight="medium">Privacy Policy</ThemedText>
            </Pressable>
            <Pressable hitSlop={6} onPress={() => openLegal(TERMS_URL)}>
              <ThemedText weight="medium">Terms of Service</ThemedText>
            </Pressable>
            <Pressable
              disabled={deleting}
              hitSlop={6}
              onPress={onDeleteAccount}
            >
              <ThemedText tone="danger" weight="medium">
                {deleting ? "Deleting account…" : "Delete account"}
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={formState.isSubmitting}
            label="Save"
            loading={formState.isSubmitting}
            onPress={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
