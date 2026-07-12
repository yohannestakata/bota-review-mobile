import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

// A load-failure state with a retry — the one place we render query errors for
// lists. Use directly in a body-branch (`isError ? <ListErrorState/> : ...`), or
// via ListStatePlaceholder below for the `ListEmptyComponent` pattern.
export function ListErrorState({
  onRetry,
  errorText = "Couldn't load this. Give it another go.",
}: {
  onRetry: () => void;
  errorText?: string;
}) {
  return (
    <View className="mt-24 items-center gap-3 px-6">
      <ThemedText className="text-center" tone="muted">
        {errorText}
      </ThemedText>
      <Pressable hitSlop={6} onPress={onRetry}>
        <ThemedText tone="brand" weight="semibold">
          Try again
        </ThemedText>
      </Pressable>
    </View>
  );
}

// The single source of truth for a list's empty slot: shows the skeleton while
// loading, an error + retry on failure, and the screen's own empty state
// otherwise. Prevents the common bug of rendering a load *failure* as "empty".
// Use as a list's `ListEmptyComponent`.
export function ListStatePlaceholder({
  isPending,
  isError,
  onRetry,
  skeleton,
  errorText = "Couldn't load this. Give it another go.",
  empty,
}: {
  isPending: boolean;
  isError: boolean;
  onRetry: () => void;
  skeleton?: ReactNode;
  errorText?: string;
  empty: ReactNode;
}) {
  if (isPending) return <>{skeleton ?? null}</>;
  if (isError) return <ListErrorState errorText={errorText} onRetry={onRetry} />;
  return <>{empty}</>;
}
