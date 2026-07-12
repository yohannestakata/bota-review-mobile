import { router } from "expo-router";
import { View } from "react-native";

import { CloseButton } from "@/components/ui/close-button";
import { ThemedText } from "@/components/ui/themed-text";

// The standard modal/stack header: a close button, a centered title, and a
// matching spacer so the title stays centered. `onClose` defaults to back;
// pass a custom handler (e.g. a discard confirm) when needed.
export function ScreenHeader({
  title,
  onClose,
}: {
  title: string;
  onClose?: () => void;
}) {
  return (
    <View className="flex-row items-center justify-between px-4 py-3">
      <CloseButton onPress={onClose ?? (() => router.back())} />
      <ThemedText size="xl" weight="bold">
        {title}
      </ThemedText>
      <View className="w-6" />
    </View>
  );
}
