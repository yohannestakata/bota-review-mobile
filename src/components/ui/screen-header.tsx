import { router } from "expo-router";
import { View } from "react-native";

import { BackButton } from "@/components/ui/back-button";
import { CloseButton } from "@/components/ui/close-button";
import { ThemedText } from "@/components/ui/themed-text";

// The header for task screens (forms you complete or abandon): a close button,
// a centered title, and a spacer as wide as the button so the title stays truly
// centered. `onClose` defaults to back; pass a custom handler (e.g. a discard
// confirm) when needed.
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
      <View className="w-10" />
    </View>
  );
}

// The header for browse screens (lists and details you drill into): a back
// arrow with a left-aligned title and an optional muted subtitle.
export function BackHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string | null;
  onBack?: () => void;
}) {
  return (
    <View className="flex-row items-center gap-3 px-4 py-3">
      <BackButton onPress={onBack ?? (() => router.back())} />
      <View className="flex-1">
        <ThemedText numberOfLines={1} size="xl" weight="bold">
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText numberOfLines={1} size="sm" tone="muted">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}
