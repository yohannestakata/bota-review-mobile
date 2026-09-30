import { BubbleChatIcon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { TextButton } from "@/components/ui/button";
import { BackHeader } from "@/components/ui/screen-header";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ThemedText } from "@/components/ui/themed-text";
import { ReplyComposerModal, type ReplyTarget } from "@/features/branch";
import {
  useDeleteMyReply,
  useMyReplies,
  useUpdateMyReply,
  type MyReply,
} from "@/features/profile";
import { getErrorMessage } from "@/lib/api";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { useState } from "react";
import { PressableFade } from "@/components/ui/pressable-scale";

function statusLabel(status: MyReply["moderationStatus"]): string | null {
  if (status === "pending") return "Under review";
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
    <View className="gap-2 rounded-2xl border border-placeholder bg-surface p-4">
      <PressableFade
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
      </PressableFade>

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
        <TextButton
          accessibilityLabel="Edit reply"
          label="Edit"
          onPress={() => onEdit(reply)}
        />
        <TextButton
          accessibilityLabel="Delete reply"
          label="Delete"
          onPress={() => onDelete(reply)}
          tone="danger"
        />
      </View>
    </View>
  );
}

export default function MyRepliesScreen() {
  const replies = useMyReplies();
  const pull = usePullToRefresh(() => replies.refetch());
  const update = useUpdateMyReply();
  const remove = useDeleteMyReply();
  const [editTarget, setEditTarget] = useState<ReplyTarget | null>(null);
  const items = replies.data ?? [];

  function onEdit(reply: MyReply) {
    setEditTarget({
      reviewId: reply.reviewId,
      replyId: reply.id,
      initialBody: reply.body,
      reviewText: reply.review.text,
    });
  }

  async function onSubmitEdit(body: string) {
    if (!editTarget?.replyId) return;
    try {
      await update.mutateAsync({ replyId: editTarget.replyId, body });
      setEditTarget(null);
    } catch (error) {
      toast.error("Reply hit a snag", getErrorMessage(error));
    }
  }

  function onDelete(reply: MyReply) {
    Alert.alert("Delete reply?", "This will tuck it away for good.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          remove.mutate(reply.id, {
            onError: (error) =>
              toast.error("Couldn't delete reply", getErrorMessage(error)),
          }),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title="Your replies" />

      {replies.isPending ? (
        <View className="gap-3 px-6 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-32 w-full rounded-2xl" key={i} />
          ))}
        </View>
      ) : replies.isError ? (
        <ListErrorState
          errorText="Couldn't load your replies."
          onRetry={() => replies.refetch()}
        />
      ) : items.length === 0 ? (
        <EmptyState
          action={{
            label: "Browse places",
            onPress: () => router.navigate("/"),
          }}
          body="Agree, disagree, or have a tip to add? Tap Reply under any review on a place's page."
          icon={BubbleChatIcon}
          title="No replies yet"
        />
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-2"
          data={items}
          ItemSeparatorComponent={ListGapMd}
          keyExtractor={(item) => item.id}
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
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
