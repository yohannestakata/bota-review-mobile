import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import {
  CollapsibleReviewText,
  formatReviewDate,
  PhotoViewer,
} from "@/features/branch";
import { colors } from "@/lib/theme";

import type { PublicReview } from "../api";

export function PublicReviewRow({
  review,
  onPress,
  onReport,
}: {
  review: PublicReview;
  onPress: (review: PublicReview) => void;
  onReport?: (reviewId: string) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const branchLabel = review.branch.label
    ? `${review.branch.placeName} · ${review.branch.label}`
    : review.branch.placeName;

  return (
    <Pressable
      className="gap-3 rounded-2xl border border-placeholder p-4"
      onPress={() => onPress(review)}
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <ThemedText numberOfLines={1} weight="semibold">
            {branchLabel}
          </ThemedText>
          <View className="flex-row items-center gap-2">
            <Stars size={12} value={review.rating} />
            <ThemedText size="xs" tone="muted">
              {formatReviewDate(review.createdAt)}
            </ThemedText>
          </View>
        </View>
        {onReport ? (
          <Pressable
            accessibilityLabel="Report review"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onReport(review.id)}
          >
            <AppIcon color={colors.muted} icon={MoreHorizontalIcon} size={18} />
          </Pressable>
        ) : null}
      </View>

      <CollapsibleReviewText key={review.text} text={review.text} />

      {review.photos.length > 0 ? (
        <>
          <ScrollView
            contentContainerClassName="gap-2"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {review.photos.map((photo, index) => (
              <Pressable key={photo.id} onPress={() => setViewerIndex(index)}>
                <Image
                  contentFit="cover"
                  source={photo.url}
                  style={{ width: 96, height: 96, borderRadius: 12 }}
                  transition={150}
                />
              </Pressable>
            ))}
          </ScrollView>
          <PhotoViewer
            initialIndex={viewerIndex ?? 0}
            onClose={() => setViewerIndex(null)}
            photos={review.photos}
            visible={viewerIndex !== null}
          />
        </>
      ) : null}
    </Pressable>
  );
}
