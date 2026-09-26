import type { ReactNode } from "react";
import { View } from "react-native";

import { TextButton } from "@/components/ui/button";
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
      <TextButton label="Try again" onPress={onRetry} size="md" />
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

// Shown above cached content when a background refresh failed, so the user
// knows what they're seeing may be out of date and can retry in place.
export function StaleDataBanner({
  onRetry,
  className = "",
}: {
  onRetry: () => void;
  className?: string;
}) {
  return (
    <View
      className={`flex-row items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3 ${className}`}
    >
      <ThemedText className="flex-1" size="sm" tone="muted">
        Showing saved results — couldn&apos;t refresh.
      </ThemedText>
      <TextButton label="Retry" onPress={onRetry} />
    </View>
  );
}
