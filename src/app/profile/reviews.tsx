import { PencilEdit02Icon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { toast } from "@/components/ui/toast";
import { EmptyState } from "@/components/ui/empty-state";
import { BackHeader } from "@/components/ui/screen-header";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { ListStatePlaceholder } from "@/components/ui/list-state-placeholder";
import { useDeleteReview } from "@/features/branch";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import {
  MyReviewRow,
  ProfileReviewsSkeleton,
  useMyReviews,
  type MyReview,
} from "@/features/profile";

export default function MyReviewsScreen() {
  const reviews = useMyReviews();
  const pull = usePullToRefresh(() => reviews.refetch());
  const deleteReview = useDeleteReview();

  function onEdit(review: MyReview) {
    router.push({
      pathname: "/review/[branchId]",
      params: {
        branchId: review.branchId,
        reviewId: review.id,
        rating: String(review.rating),
        text: review.text,
      },
    });
  }

  function onDelete(review: MyReview) {
    Alert.alert("Delete review?", "This take will disappear from Bota.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteReview.mutate(
            {
              reviewId: review.id,
              branchId: review.branchId,
            },
            {
              onError: () =>
                toast.error(
                  "Couldn't delete",
                  "That didn't go through. Try again in a moment.",
                ),
            },
          ),
      },
    ]);
  }

  const items = reviews.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title="Your reviews" />

      <FlashList
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-10 pt-2"
        data={items}
        ItemSeparatorComponent={ListGapMd}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ListStatePlaceholder
            empty={
              <EmptyState
                action={{
                  label: "Find a place you've been",
                  onPress: () => router.navigate("/search"),
                }}
                body="Your takes help the next person decide where to eat. Start with somewhere you loved (or didn't)."
                className="mt-8"
                icon={PencilEdit02Icon}
                secondaryAction={{
                  label: "Pick from your saved places",
                  onPress: () => router.navigate("/saved"),
                }}
                title="No reviews yet"
              />
            }
            errorText="Couldn't load your reviews."
            isError={reviews.isError}
            isPending={reviews.isPending}
            onRetry={() => reviews.refetch()}
            skeleton={<ProfileReviewsSkeleton />}
          />
        }
        onRefresh={pull.onRefresh}
        refreshing={pull.refreshing}
        renderItem={({ item }: { item: MyReview }) => (
          <MyReviewRow
            onDelete={onDelete}
            onEdit={onEdit}
            onPress={(review) => router.push(`/branch/${review.branchId}`)}
            review={item}
          />
        )}
      />
    </SafeAreaView>
  );
}
