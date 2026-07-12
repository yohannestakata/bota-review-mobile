import { router } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { ScreenHeader } from "@/components/ui/screen-header";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { ListStatePlaceholder } from "@/components/ui/list-state-placeholder";
import { ThemedText } from "@/components/ui/themed-text";
import { useDeleteReview } from "@/features/branch";
import {
  MyReviewRow,
  ProfileReviewsSkeleton,
  useMyReviews,
  type MyReview,
} from "@/features/profile";

export default function MyReviewsScreen() {
  const reviews = useMyReviews();
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
                Alert.alert(
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
      <ScreenHeader title="Your reviews" />

      <FlashList
        contentContainerClassName="px-6 pb-10 pt-2"
        data={items}
        ItemSeparatorComponent={ListGapMd}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ListStatePlaceholder
            empty={
              <View className="mt-8 items-center px-6">
                <ThemedText className="text-center" tone="muted">
                  No reviews yet — go share a hot take.
                </ThemedText>
              </View>
            }
            errorText="Couldn't load your reviews."
            isError={reviews.isError}
            isPending={reviews.isPending}
            onRetry={() => reviews.refetch()}
            skeleton={<ProfileReviewsSkeleton />}
          />
        }
        onRefresh={() => reviews.refetch()}
        refreshing={reviews.isFetching && !reviews.isPending}
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
