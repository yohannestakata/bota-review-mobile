import { Image } from "expo-image";
import { View } from "react-native";

import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";

import type { BranchReview } from "../api";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function ReviewRow({ review }: { review: BranchReview }) {
  return (
    <View className="gap-3 rounded-2xl border border-neutral-100 p-4">
      <View className="flex-row items-center gap-3">
        <View className="size-10 overflow-hidden rounded-full bg-neutral-200">
          {review.user.avatarUrl ? (
            <Image
              contentFit="cover"
              source={review.user.avatarUrl}
              style={{ width: "100%", height: "100%" }}
            />
          ) : null}
        </View>
        <View className="flex-1">
          <ThemedText weight="medium">{review.user.displayName}</ThemedText>
          <Stars size={12} value={review.rating} />
        </View>
        <ThemedText size="xs" tone="muted">
          {formatDate(review.createdAt)}
        </ThemedText>
      </View>
      <ThemedText className="leading-5" tone="muted">
        {review.text}
      </ThemedText>
    </View>
  );
}
