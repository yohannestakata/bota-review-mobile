import { MoreHorizontalIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { Stars } from "@/components/ui/stars";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

import type { BranchReview, ReviewReply } from "../api";
import { PhotoViewer } from "./photo-viewer";

function ReplyItem({ reply }: { reply: ReviewReply }) {
  const isOwner = reply.authorRole === "owner";
  return (
    <View className="gap-1 rounded-xl bg-surface p-3">
      <View className="flex-row items-center gap-2">
        <ThemedText size="sm" weight="medium">
          {reply.user.displayName}
        </ThemedText>
        {isOwner ? (
          <View className="rounded-full border border-primary px-2 py-0.5">
            <ThemedText size="xs" tone="brand" weight="semibold">
              Owner
            </ThemedText>
          </View>
        ) : null}
        <ThemedText size="xs" tone="muted">
          {formatReviewDate(reply.createdAt)}
        </ThemedText>
      </View>
      <ThemedText size="sm" tone="muted">
        {reply.body}
      </ThemedText>
    </View>
  );
}

function ReplyComposer({
  onSubmit,
}: {
  onSubmit: (body: string) => Promise<{ moderationStatus: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  if (!open) {
    return (
      <Pressable className="self-start" hitSlop={6} onPress={() => setOpen(true)}>
        <ThemedText size="sm" tone="brand" weight="medium">
          Reply
        </ThemedText>
      </Pressable>
    );
  }

  async function submit() {
    const trimmed = body.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setNote(null);
    try {
      const result = await onSubmit(trimmed);
      setBody("");
      if (result.moderationStatus === "approved") {
        setOpen(false);
      } else {
        setNote("Your reply was submitted and is awaiting review.");
      }
    } catch {
      setNote("Couldn't send your reply. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="gap-2">
      <TextInput
        autoFocus
        className="min-h-16 rounded-xl border border-placeholder bg-surface px-3 py-2 font-outfit text-md text-foreground"
        multiline
        onChangeText={setBody}
        placeholder="Write a reply…"
        placeholderTextColor={colors.muted}
        textAlignVertical="top"
        value={body}
      />
      {note ? (
        <ThemedText size="xs" tone="muted">
          {note}
        </ThemedText>
      ) : null}
      <View className="flex-row items-center justify-end gap-4">
        <Pressable
          hitSlop={6}
          onPress={() => {
            setOpen(false);
            setBody("");
            setNote(null);
          }}
        >
          <ThemedText size="sm" tone="muted">
            Cancel
          </ThemedText>
        </Pressable>
        <Pressable disabled={submitting || !body.trim()} hitSlop={6} onPress={submit}>
          {submitting ? (
            <ActivityIndicator color={colors.foreground} size="small" />
          ) : (
            <ThemedText
              size="sm"
              tone={body.trim() ? "brand" : "muted"}
              weight="semibold"
            >
              Send
            </ThemedText>
          )}
        </Pressable>
      </View>
    </View>
  );
}

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
  onReply,
}: {
  review: BranchReview;
  onReport?: (reviewId: string) => void;
  onUserPress?: (userId: string) => void;
  // When provided (signed-in users), shows a reply composer. Resolves with the
  // created reply's moderation status so the composer can message the user.
  onReply?: (
    reviewId: string,
    body: string,
  ) => Promise<{ moderationStatus: string }>;
}) {
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  // Older/cached branch-detail responses may predate review photos.
  const photos = review.photos ?? [];
  const replies = review.replies ?? [];

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

      {replies.length > 0 || onReply ? (
        <View className="gap-2 border-l border-placeholder pl-3">
          {replies.map((reply) => (
            <ReplyItem key={reply.id} reply={reply} />
          ))}
          {onReply ? (
            <ReplyComposer
              onSubmit={(body) => onReply(review.id, body)}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
