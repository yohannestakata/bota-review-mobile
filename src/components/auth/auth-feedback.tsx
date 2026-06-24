import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <View className="flex-row items-center gap-3 py-1">
      <View className="h-px flex-1 bg-border" />
      <ThemedText size="sm" tone="muted">
        {label}
      </ThemedText>
      <View className="h-px flex-1 bg-border" />
    </View>
  );
}

export function AuthError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return (
    <View accessibilityRole="alert" className="rounded-xl bg-danger-soft px-4 py-3">
      <ThemedText size="sm" tone="danger">
        {message}
      </ThemedText>
    </View>
  );
}
