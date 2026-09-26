import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import { CollapsibleReviewText, PhotoViewer } from "@/features/branch";
import { formatRelativeDate } from "@/lib/format-date";
import { colors } from "@/lib/theme";

import type { PublicReview } from "../api";
import { PressableScale } from "@/components/ui/pressable-scale";

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
    <PressableScale
      scaleTo={0.985}
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
              {formatRelativeDate(review.createdAt)}
            </ThemedText>
          </View>
        </View>
        {onReport ? (
          <PressableScale
            accessibilityLabel="Report review"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => onReport(review.id)}
          >
            <AppIcon color={colors.muted} icon={MoreHorizontalIcon} size={18} />
          </PressableScale>
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
              <PressableScale
                key={photo.id}
                onPress={() => setViewerIndex(index)}
              >
                <Image
                  contentFit="cover"
                  source={photo.url}
                  style={{ width: 96, height: 96, borderRadius: 12 }}
                  transition={150}
                />
              </PressableScale>
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
    </PressableScale>
  );
}
