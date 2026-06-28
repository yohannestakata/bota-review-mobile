import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { Pressable, ScrollView, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { Avatar } from "@/components/ui/avatar";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import type { BranchReview, ReviewReply } from "../api";
import { PhotoViewer } from "./photo-viewer";

const COLLAPSED_LINES = 4;
const REPLY_PREVIEW_COUNT = 2;

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

function ActionLink({
  label,
  tone = "brand",
  onPress,
}: {
  label: string;
  tone?: "brand" | "muted" | "danger";
  onPress: () => void;
}) {
  return (
    <Pressable hitSlop={6} onPress={onPress}>
      <ThemedText size="xs" tone={tone} weight="medium">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function ReplyItem({
  reply,
  businessName,
  isOwn,
  onReport,
}: {
  reply: ReviewReply;
  businessName?: string;
  isOwn: boolean;
  onReport?: () => void;
}) {
  const isOwner = reply.authorRole === "owner";
  // Owner replies speak for the business, not the person who typed them.
  const title = isOwner
    ? `Response from ${businessName ?? "the owner"}`
    : reply.user.displayName;

  // Own replies are managed from the profile screen, so no inline actions there.
  const showReport = !isOwn && Boolean(onReport);

  // Comment-thread style: avatar + name/date header, then full-width body.
  return (
    <View className="gap-2">
      <View className="flex-row items-center gap-2.5">
        <Avatar
          name={isOwner ? businessName : reply.user.displayName}
          size={28}
          uri={isOwner ? undefined : reply.user.avatarUrl}
        />
        <View className="flex-1">
          <ThemedText
            numberOfLines={1}
            size="sm"
            tone={isOwner ? "brand" : "default"}
            weight={isOwner ? "semibold" : "medium"}
          >
            {title}
          </ThemedText>
          <ThemedText size="xs" tone="muted">
            {formatReviewDate(reply.createdAt)}
          </ThemedText>
        </View>
      </View>

      <ThemedText size="sm" tone="muted">
        {reply.body}
      </ThemedText>

      {showReport ? (
        <ActionLink label="Report" onPress={onReport!} tone="muted" />
      ) : null}
    </View>
  );
}

export function ReviewRow({
  review,
  businessName,
  currentUserId,
  onReport,
  onUserPress,
  onReply,
  onReportReply,
}: {
  review: BranchReview;
  businessName?: string;
  currentUserId?: string;
  onReport?: (reviewId: string) => void;
  onUserPress?: (userId: string) => void;
  // Provided for signed-in users; opens the screen-level composer.
  onReply?: (review: BranchReview) => void;
  onReportReply?: (reply: ReviewReply) => void;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  // Older/cached branch-detail responses may predate review photos/replies.
  const photos = review.photos ?? [];
  const replies = review.replies ?? [];
  // You can't reply to your own review (edit it instead).
  const isOwnReview = Boolean(
    currentUserId && review.user.id === currentUserId,
  );
  // Hide Reply once the user already has a reply on this review.
  const alreadyReplied = Boolean(
    currentUserId && replies.some((reply) => reply.user.id === currentUserId),
  );
  const canReply = Boolean(onReply) && !isOwnReview && !alreadyReplied;

  const visibleReplies = showAllReplies
    ? replies
    : replies.slice(0, REPLY_PREVIEW_COUNT);
  const hiddenCount = replies.length - visibleReplies.length;

  return (
    <View className="gap-3">
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

      {replies.length > 0 ? (
        <View className="mt-2 gap-3 pl-4">
          {visibleReplies.map((reply) => {
            const isOwn = Boolean(
              currentUserId && reply.user.id === currentUserId,
            );
            return (
              <ReplyItem
                key={reply.id}
                businessName={businessName}
                isOwn={isOwn}
                onReport={
                  !isOwn && onReportReply
                    ? () => onReportReply(reply)
                    : undefined
                }
                reply={reply}
              />
            );
          })}

          {hiddenCount > 0 ? (
            <ActionLink
              label={`View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
              onPress={() => setShowAllReplies(true)}
              tone="muted"
            />
          ) : replies.length > REPLY_PREVIEW_COUNT ? (
            <ActionLink
              label="Show fewer replies"
              onPress={() => setShowAllReplies(false)}
              tone="muted"
            />
          ) : null}
        </View>
      ) : null}

      {canReply ? (
        <View className="mt-2 pl-4">
          <ActionLink label="Reply" onPress={() => onReply!(review)} />
        </View>
      ) : null}
    </View>
  );
}
