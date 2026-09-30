import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ScrollView, View } from "react-native";

import { Photo } from "@/components/ui/photo";
import { AppIcon } from "@/components/ui/huge-icon";
import { Avatar } from "@/components/ui/avatar";
import { TextButton } from "@/components/ui/button";
import { ExpandableText } from "@/components/ui/expandable-text";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import { formatRelativeDate } from "@/lib/format-date";
import { useColors } from "@/lib/theme";

import type { BranchReview, ReviewReply } from "../api";
import { PhotoViewer } from "./photo-viewer";
import { PressableFade, PressableScale } from "@/components/ui/pressable-scale";

const COLLAPSED_LINES = 4;
const REPLY_PREVIEW_COUNT = 2;
export const REPLY_AVATAR_SIZE = 28;
export const REPLY_NAME_SIZE = "md" as const;

// Review text, clamped with "Read more" (same measuring as descriptions).
export function CollapsibleReviewText({ text }: { text: string }) {
  return (
    <ExpandableText
      lessLabel="Read less"
      lineHeightClass="leading-5"
      lines={COLLAPSED_LINES}
      moreLabel="Read more"
      text={text}
    />
  );
}

function ReplyItem({
  reply,
  businessName,
  businessAvatarUrl,
  isOwn,
  onReport,
}: {
  reply: ReviewReply;
  businessName?: string;
  businessAvatarUrl?: string;
  isOwn: boolean;
  onReport?: () => void;
}) {
  const colors = useColors();
  const isOwner = reply.authorRole === "owner";
  // Owner replies speak for the business, not the person who typed them.
  const title = isOwner
    ? `Response from ${businessName ?? "the owner"}`
    : reply.user.displayName;
  const timestamp =
    isOwn && reply.moderationStatus === "pending"
      ? `${formatRelativeDate(reply.createdAt)} · Posted`
      : formatRelativeDate(reply.createdAt);

  // Own replies are managed from the profile screen, so no inline actions there.
  const showReport = !isOwn && Boolean(onReport);

  // Comment-thread style: avatar + name/date header, then full-width body.
  return (
    <View className="gap-2">
      <View className="flex-row items-start gap-2.5">
        <Avatar
          name={isOwner ? businessName : reply.user.displayName}
          size={REPLY_AVATAR_SIZE}
          uri={isOwner ? businessAvatarUrl : reply.user.avatarUrl}
        />
        <View className="flex-1">
          <ThemedText
            numberOfLines={1}
            size={REPLY_NAME_SIZE}
            tone={isOwner ? "brand" : "default"}
            weight={isOwner ? "semibold" : "medium"}
          >
            {title}
          </ThemedText>
          <ThemedText size="xs" tone="muted">
            {timestamp}
          </ThemedText>
        </View>
        {showReport ? (
          <PressableFade
            accessibilityLabel="Report reply"
            accessibilityRole="button"
            hitSlop={12}
            onPress={onReport}
          >
            <AppIcon color={colors.muted} icon={MoreHorizontalIcon} size={18} />
          </PressableFade>
        ) : null}
      </View>

      <ThemedText size="md" tone="muted">
        {reply.body}
      </ThemedText>
    </View>
  );
}

export function ReviewRow({
  review,
  businessName,
  businessAvatarUrl,
  currentUserId,
  onReport,
  onUserPress,
  onReply,
  onReportReply,
}: {
  review: BranchReview;
  businessName?: string;
  businessAvatarUrl?: string;
  currentUserId?: string;
  onReport?: (reviewId: string) => void;
  onUserPress?: (userId: string) => void;
  // Provided for signed-in users; opens the screen-level composer.
  onReply?: (review: BranchReview) => void;
  onReportReply?: (reply: ReviewReply) => void;
}) {
  const colors = useColors();
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showAllReplies, setShowAllReplies] = useState(false);
  // Older/cached branch-detail responses may predate review photos/replies.
  const photos = review.photos ?? [];
  // Read like a conversation: oldest first (the API sends newest first).
  const replies = [...(review.replies ?? [])].sort(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt),
  );
  // You can't reply to your own review (edit it instead).
  const isOwnReview = Boolean(
    currentUserId && review.user.id === currentUserId,
  );
  // Hide Reply once the user already has a reply on this review.
  const alreadyReplied = Boolean(
    currentUserId && replies.some((reply) => reply.user.id === currentUserId),
  );
  const canReply = Boolean(onReply) && !isOwnReview && !alreadyReplied;

  const ownReply = currentUserId
    ? replies.find((reply) => reply.user.id === currentUserId)
    : undefined;
  // The first few replies, plus your own if it's further down, kept in order.
  const previewReplies = replies.filter(
    (reply, index) => index < REPLY_PREVIEW_COUNT || reply.id === ownReply?.id,
  );
  const visibleReplies = showAllReplies ? replies : previewReplies;
  const hiddenCount = replies.length - visibleReplies.length;

  return (
    <View className="gap-3">
      <View className="flex-row items-start gap-3">
        <PressableFade
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
                {formatRelativeDate(review.createdAt)}
              </ThemedText>
            </View>
          </View>
        </PressableFade>
        {onReport ? (
          <PressableFade
            accessibilityLabel="Report review"
            accessibilityRole="button"
            hitSlop={12}
            onPress={() => onReport(review.id)}
          >
            <AppIcon color={colors.muted} icon={MoreHorizontalIcon} size={18} />
          </PressableFade>
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
              <PressableScale
                accessibilityLabel={`Review photo ${index + 1}`}
                accessibilityRole="imagebutton"
                key={photo.id}
                onPress={() => setViewerIndex(index)}
              >
                <Photo
                  displayWidth={96}
                  style={{ width: 96, height: 96, borderRadius: 12 }}
                  thumbhash={photo.thumbhash}
                  uri={photo.url}
                />
              </PressableScale>
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
        <View className="mt-2 gap-3 border-l border-placeholder pl-4">
          {visibleReplies.map((reply) => {
            const isOwn = Boolean(
              currentUserId && reply.user.id === currentUserId,
            );
            return (
              <ReplyItem
                key={reply.id}
                businessAvatarUrl={businessAvatarUrl}
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
            <TextButton
              label={`View ${hiddenCount} more ${hiddenCount === 1 ? "reply" : "replies"}`}
              onPress={() => setShowAllReplies(true)}
              tone="muted"
            />
          ) : replies.length > REPLY_PREVIEW_COUNT ? (
            <TextButton
              label="Show fewer replies"
              onPress={() => setShowAllReplies(false)}
              tone="muted"
            />
          ) : null}
        </View>
      ) : null}

      {canReply ? (
        <View className="mt-2">
          <TextButton
            accessibilityLabel={`Reply to ${review.user.displayName}`}
            label="Reply"
            onPress={() => onReply!(review)}
          />
        </View>
      ) : null}
    </View>
  );
}
