import { useState } from "react";

import { Alert } from "@/components/ui/alert";
import { getErrorMessage } from "@/lib/api";

import type { BranchReview, ReviewReply } from "./api";
import type { ReplyTarget } from "./components/reply-composer-modal";
import { useCreateReply, useReportReply } from "./queries";

// Reply create + report flows + composer state for the branch-detail and
// all-reviews screens. Editing/deleting your own reply is done from the profile
// "Your replies" screen, not inline here.
export function useReplyActions(branchId: string) {
  const [target, setTarget] = useState<ReplyTarget | null>(null);
  const create = useCreateReply(branchId);
  const report = useReportReply();

  function startReply(review: BranchReview) {
    setTarget({
      reviewId: review.id,
      reviewAuthorName: review.user.displayName,
      reviewAuthorAvatarUrl: review.user.avatarUrl,
      reviewText: review.text,
    });
  }

  async function submit(body: string) {
    if (!target || !body) return;
    try {
      const result = await create.mutateAsync({
        reviewId: target.reviewId,
        body,
      });
      setTarget(null);
      if (result.moderationStatus !== "approved") {
        Alert.alert("Reply posted", "Your reply is live.");
      }
    } catch (error) {
      Alert.alert("Reply hit a snag", getErrorMessage(error));
    }
  }

  function reportReply(reply: ReviewReply) {
    Alert.alert("Flag this reply?", "We'll give it a careful look.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: () =>
          report.mutate(
            { replyId: reply.id },
            {
              onSuccess: () =>
                Alert.alert("Got it", "Thanks for keeping Bota helpful."),
              onError: (error) =>
                Alert.alert("Couldn't send report", getErrorMessage(error)),
            },
          ),
      },
    ]);
  }

  return {
    target,
    submitting: create.isPending,
    closeComposer: () => setTarget(null),
    submit,
    startReply,
    reportReply,
  };
}
