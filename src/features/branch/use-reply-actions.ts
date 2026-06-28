import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { getErrorMessage } from "@/lib/api";

import type { ReviewReply } from "./api";
import type { ReplyTarget } from "./components/reply-composer-modal";
import {
  useCreateReply,
  useDeleteReply,
  useReportReply,
  useUpdateReply,
} from "./queries";

// Centralizes the reply create/edit/delete/report flows + composer state so the
// branch-detail and all-reviews screens share one implementation.
export function useReplyActions(branchId: string) {
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const create = useCreateReply(branchId);
  const update = useUpdateReply(branchId);
  const remove = useDeleteReply(branchId);
  const report = useReportReply();

  function startReply(reviewId: string) {
    setTarget({ reviewId });
  }

  function startEditReply(reply: ReviewReply) {
    setTarget({
      reviewId: reply.reviewId,
      replyId: reply.id,
      initialBody: reply.body,
    });
  }

  async function submit(body: string) {
    if (!target || !body) return;
    try {
      if (target.replyId) {
        await update.mutateAsync({ replyId: target.replyId, body });
        setTarget(null);
      } else {
        const result = await create.mutateAsync({
          reviewId: target.reviewId,
          body,
        });
        setTarget(null);
        if (result.moderationStatus !== "approved") {
          Alert.alert(
            "Reply submitted",
            "Your reply will appear once it's approved.",
          );
        }
      }
    } catch (error) {
      Alert.alert("Couldn't post reply", getErrorMessage(error));
    }
  }

  function deleteReply(reply: ReviewReply) {
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

  function reportReply(reply: ReviewReply) {
    Alert.alert("Report reply", "Report this reply for our team to review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: () =>
          report.mutate(
            { replyId: reply.id },
            {
              onSuccess: () => Alert.alert("Thanks", "We'll take a look."),
              onError: (error) =>
                Alert.alert("Couldn't report", getErrorMessage(error)),
            },
          ),
      },
    ]);
  }

  return {
    target,
    submitting: create.isPending || update.isPending,
    closeComposer: () => setTarget(null),
    submit,
    startReply,
    startEditReply,
    deleteReply,
    reportReply,
  };
}
