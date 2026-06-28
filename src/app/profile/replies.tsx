import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { BackButton } from "@/components/ui/back-button";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
import { ReplyComposerModal, type ReplyTarget } from "@/features/branch";
import {
  useDeleteMyReply,
  useMyReplies,
  useUpdateMyReply,
  type MyReply,
} from "@/features/profile";
import { getErrorMessage } from "@/lib/api";
import { useState } from "react";

function statusLabel(status: MyReply["moderationStatus"]): string | null {
  if (status === "pending") return "Pending review";
  if (status === "rejected") return "Rejected";
  return null;
}

function ReplyRow({
  reply,
  onEdit,
  onDelete,
}: {
  reply: MyReply;
  onEdit: (reply: MyReply) => void;
  onDelete: (reply: MyReply) => void;
}) {
  const status = statusLabel(reply.moderationStatus);
  return (
    <View className="gap-2 rounded-2xl border border-placeholder p-4">
      <Pressable
        onPress={() => router.push(`/branch/${reply.branchId}`)}
        className="flex-row items-center justify-between gap-2"
      >
        <ThemedText className="flex-1" numberOfLines={1} weight="medium">
          {reply.branch.label ?? "View branch"}
        </ThemedText>
        {reply.authorRole === "owner" ? (
          <View className="rounded-full border border-primary px-2 py-0.5">
            <ThemedText size="xs" tone="brand" weight="semibold">
              Owner
            </ThemedText>
          </View>
        ) : null}
      </Pressable>

      <ThemedText size="sm">{reply.body}</ThemedText>

      <View className="rounded-xl border border-placeholder p-2">
        <ThemedText size="xs" tone="muted">
          Replying to
        </ThemedText>
        <ThemedText numberOfLines={2} size="sm" tone="muted">
          {reply.review.text}
        </ThemedText>
      </View>

      <View className="flex-row items-center gap-4">
        {status ? (
          <ThemedText size="xs" tone="muted">
            {status}
          </ThemedText>
        ) : null}
        <View className="flex-1" />
        <Pressable hitSlop={6} onPress={() => onEdit(reply)}>
          <ThemedText size="sm" tone="brand" weight="medium">
            Edit
          </ThemedText>
        </Pressable>
        <Pressable hitSlop={6} onPress={() => onDelete(reply)}>
          <ThemedText size="sm" tone="danger" weight="medium">
            Delete
          </ThemedText>
        </Pressable>
      </View>
    </View>
  );
}

export default function MyRepliesScreen() {
  const replies = useMyReplies();
  const update = useUpdateMyReply();
  const remove = useDeleteMyReply();
  const [editTarget, setEditTarget] = useState<ReplyTarget | null>(null);
  const items = replies.data ?? [];

  function onEdit(reply: MyReply) {
    setEditTarget({
      reviewId: reply.reviewId,
      replyId: reply.id,
      initialBody: reply.body,
    });
  }

  async function onSubmitEdit(body: string) {
    if (!editTarget?.replyId) return;
    try {
      await update.mutateAsync({ replyId: editTarget.replyId, body });
      setEditTarget(null);
    } catch (error) {
      Alert.alert("Couldn't save", getErrorMessage(error));
    }
  }

  function onDelete(reply: MyReply) {
    Alert.alert("Delete reply", "Remove this reply?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(reply.id, {
            onError: (error) =>
              Alert.alert("Couldn't delete", getErrorMessage(error)),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <ThemedText size="lg" weight="semibold">
          Your replies
        </ThemedText>
      </View>

      {replies.isPending ? (
        <View className="gap-3 px-6 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-32 w-full rounded-2xl" key={i} />
          ))}
        </View>
      ) : items.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <ThemedText className="text-center" tone="muted">
            You haven&apos;t replied to any reviews yet.
          </ThemedText>
        </View>
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-2"
          data={items}
          ItemSeparatorComponent={ListGapMd}
          keyExtractor={(item) => item.id}
          onRefresh={() => replies.refetch()}
          refreshing={replies.isFetching && !replies.isPending}
          renderItem={({ item }: { item: MyReply }) => (
            <ReplyRow onDelete={onDelete} onEdit={onEdit} reply={item} />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReplyComposerModal
        onClose={() => setEditTarget(null)}
        onSubmit={onSubmitEdit}
        submitting={update.isPending}
        target={editTarget}
      />
    </SafeAreaView>
  );
}
