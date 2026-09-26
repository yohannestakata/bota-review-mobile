import { StarIcon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/ui/screen-header";
import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashList } from "@/components/ui/flash-list";
import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ReplyComposerModal,
  ReviewRow,
  useBranchReviews,
  useReplyActions,
  useReportReview,
} from "@/features/branch";
import { useMe } from "@/features/profile";
import { getErrorMessage } from "@/lib/api";

export default function BranchReviewsScreen() {
  const { branchId, name } = useLocalSearchParams<{
    branchId: string;
    name?: string;
  }>();
  const { isSignedIn } = useAuth();
  const reviews = useBranchReviews(branchId);
  const data = reviews.data ?? [];
  const reportReview = useReportReview();
  const me = useMe();
  const replyActions = useReplyActions(branchId);

  function onReportReview(reviewId: string) {
    if (!isSignedIn) {
      router.push("/login");
      return;
    }
    Alert.alert("Flag this review?", "We'll give it a careful look.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: () =>
          reportReview.mutate(
            { reviewId },
            {
              onSuccess: () =>
                toast.success("Got it", "Thanks for keeping Bota helpful."),
              onError: (e) =>
                toast.error("Couldn't send report", getErrorMessage(e)),
            },
          ),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader subtitle={name} title="Reviews" />

      {reviews.isPending ? (
        <View className="gap-3 px-6 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-28 w-full rounded-2xl" key={i} />
          ))}
        </View>
      ) : reviews.isError ? (
        <ListErrorState
          errorText="Couldn't load reviews."
          onRetry={() => reviews.refetch()}
        />
      ) : data.length === 0 ? (
        <EmptyState
          action={{
            label: "Write the first review",
            onPress: () =>
              router.push(isSignedIn ? `/review/${branchId}` : "/login"),
          }}
          body="Been here? Your take helps the next person decide."
          icon={StarIcon}
          title="No reviews yet"
        />
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-2"
          data={data}
          ItemSeparatorComponent={() => (
            <View className="my-5 h-px bg-border" />
          )}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ReviewRow
              businessName={name}
              currentUserId={me.data?.id}
              onReply={isSignedIn ? replyActions.startReply : undefined}
              onReportReply={isSignedIn ? replyActions.reportReply : undefined}
              onReport={onReportReview}
              onUserPress={(userId) =>
                router.push(`/profile/${userId}` as Href)
              }
              review={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <ReplyComposerModal
        onClose={replyActions.closeComposer}
        onSubmit={replyActions.submit}
        submitting={replyActions.submitting}
        target={replyActions.target}
      />
    </SafeAreaView>
  );
}
