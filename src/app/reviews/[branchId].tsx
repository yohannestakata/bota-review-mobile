import { useAuth } from "@clerk/clerk-expo";
import { router, type Href, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { BackButton } from "@/components/ui/back-button";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
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
    Alert.alert(
      "Report review",
      "Report this review for our team to look into?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Report",
          style: "destructive",
          onPress: () =>
            reportReview.mutate(
              { reviewId },
              {
                onSuccess: () =>
                  Alert.alert("Thanks", "We'll take a look at this."),
                onError: (e) =>
                  Alert.alert("Couldn't report", getErrorMessage(e)),
              },
            ),
        },
      ],
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <View className="flex-1">
          <ThemedText size="lg" weight="semibold">
            Reviews
          </ThemedText>
          {name ? (
            <ThemedText numberOfLines={1} size="sm" tone="muted">
              {name}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {reviews.isPending ? (
        <View className="gap-3 px-6 pt-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton className="h-28 w-full rounded-2xl" key={i} />
          ))}
        </View>
      ) : data.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <ThemedText className="text-center" tone="muted">
            No reviews yet — be the first to weigh in!
          </ThemedText>
        </View>
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-2"
          data={data}
          ItemSeparatorComponent={ListGapMd}
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
