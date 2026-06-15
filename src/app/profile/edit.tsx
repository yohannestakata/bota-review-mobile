import { useUser } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { Cancel01Icon } from "@hugeicons/core-free-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthField } from "@/components/auth/auth-screen";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { getAuthMessage } from "@/lib/auth";

export default function EditProfileScreen() {
  const { user } = useUser();

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

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

  async function onSave() {
    if (!user || saving) {
      return;
    }

    setError("");
    setSaving(true);

    try {
      if (avatarData) {
        await user.setProfileImage({ file: avatarData });
      }
      await user.update({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        username: username.trim(),
      });
      router.back();
    } catch (err) {
      setError(getAuthMessage(err));
      setSaving(false);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="flex-row items-center justify-between px-4 py-3">
        <Pressable hitSlop={8} onPress={() => router.back()}>
          <AppIcon color={colors.foreground} icon={Cancel01Icon} size={24} />
        </Pressable>
        <ThemedText size="lg" weight="semibold">
          Edit profile
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

          <AuthField
            autoCapitalize="words"
            label="First name"
            onChangeText={setFirstName}
            placeholder="First name"
            value={firstName}
          />
          <AuthField
            autoCapitalize="words"
            label="Last name"
            onChangeText={setLastName}
            placeholder="Last name"
            value={lastName}
          />
          <AuthField
            autoComplete="username"
            label="Username"
            onChangeText={setUsername}
            placeholder="yourname"
            value={username}
          />

          {error ? (
            <ThemedText size="sm" tone="brand">
              {error}
            </ThemedText>
          ) : null}
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button
            disabled={saving}
            label="Save"
            loading={saving}
            onPress={onSave}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
