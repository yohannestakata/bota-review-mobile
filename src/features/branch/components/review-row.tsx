import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import type { BranchReview } from "../api";
import { PhotoViewer } from "./photo-viewer";

const COLLAPSED_LINES = 4;

export function CollapsibleReviewText({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const [truncatable, setTruncatable] = useState<boolean | null>(null);

  return (
    <View className="relative gap-1">
      <ThemedText
        className="leading-5"
        numberOfLines={expanded ? undefined : COLLAPSED_LINES}
        tone="muted"
      >
        {text}
      </ThemedText>

      {truncatable === null ? (
        <ThemedText
          accessibilityElementsHidden
          className="absolute inset-x-0 leading-5 opacity-0"
          importantForAccessibility="no-hide-descendants"
          onTextLayout={(event) => {
            setTruncatable(event.nativeEvent.lines.length > COLLAPSED_LINES);
          }}
          pointerEvents="none"
          tone="muted"
        >
          {text}
        </ThemedText>
      ) : null}

      {truncatable ? (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={6}
          onPress={() => setExpanded((value) => !value)}
        >
          <ThemedText size="sm" weight="medium">
            {expanded ? "Read less" : "Read more"}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}

export function ReviewRow({
  review,
  onReport,
  onUserPress,
}: {
  review: BranchReview;
  onReport?: (reviewId: string) => void;
  onUserPress?: (userId: string) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // Older/cached branch-detail responses may predate review photos.
  const photos = review.photos ?? [];

  return (
    <View className="gap-3 rounded-2xl border border-placeholder p-4">
      <View className="flex-row items-start gap-3">
        <Pressable
          className="flex-1 flex-row items-center gap-3"
          disabled={!onUserPress}
          onPress={() => onUserPress?.(review.user.id)}
        >
          <View className="size-10 overflow-hidden rounded-full bg-placeholder">
            {review.user.avatarUrl ? (
              <Image
                contentFit="cover"
                source={review.user.avatarUrl}
                style={{ width: "100%", height: "100%" }}
              />
            ) : (
              <View className="size-full items-center justify-center">
                <ThemedText weight="semibold">
                  {review.user.displayName.charAt(0).toUpperCase()}
                </ThemedText>
              </View>
            )}
          </View>
          <View className="flex-1 gap-0.5">
            <ThemedText weight="medium">{review.user.displayName}</ThemedText>
            <View className="flex-row items-center gap-2">
              <Stars size={12} value={review.rating} />
              <ThemedText size="xs" tone="muted">
                {formatReviewDate(review.createdAt)}
              </ThemedText>
            </View>
          </View>
        </Pressable>
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

      {photos.length > 0 ? (
        <>
          <ScrollView
            contentContainerClassName="gap-2"
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {photos.map((photo, index) => (
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
            photos={photos}
            visible={viewerIndex !== null}
          />
        </>
      ) : null}

    </View>
  );
}
