import { useAuth } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { BackButton } from "@/components/ui/back-button";
import { FlashList, ListGapMd } from "@/components/ui/flash-list";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
import {
  PublicReviewRow,
  useMe,
  usePublicProfile,
  usePublicReviews,
} from "@/features/profile";
import { useReportReview } from "@/features/branch";
import { getErrorMessage } from "@/lib/api";

function memberSince(date: string) {
  return new Date(date).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export default function PublicProfileScreen() {
  const { isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const profile = usePublicProfile(id);
  const reviews = usePublicReviews(id);
  const reportReview = useReportReview();
  const reviewItems = reviews.data?.pages.flat() ?? [];
  const isLoading = profile.isPending || reviews.isPending;
  const isError = profile.isError || reviews.isError;
  const canReport = !isSignedIn || (me.data != null && me.data.id !== id);

  const refresh = () => {
    void profile.refetch();
    void reviews.refetch();
  };

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
                onError: (error) =>
                  Alert.alert("Couldn't report", getErrorMessage(error)),
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
        <ThemedText size="lg" weight="semibold">
          Reviewer
        </ThemedText>
      </View>

      {isLoading ? (
        <View className="gap-5 px-6 pt-4">
          <View className="flex-row items-center gap-4">
            <Skeleton className="size-20 rounded-full" />
            <View className="flex-1 gap-2">
              <Skeleton className="h-7 w-40 rounded-lg" />
              <Skeleton className="h-5 w-32 rounded-lg" />
              <Skeleton className="h-5 w-20 rounded-lg" />
            </View>
          </View>
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton className="h-36 w-full rounded-2xl" key={index} />
          ))}
        </View>
      ) : isError || !profile.data ? (
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <ThemedText size="lg" weight="medium">
            User not found
          </ThemedText>
          <ThemedText className="text-center" tone="muted">
            We couldn&apos;t load this reviewer&apos;s profile.
          </ThemedText>
          <Pressable onPress={refresh}>
            <ThemedText tone="brand" weight="semibold">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-4"
          data={reviewItems}
          ItemSeparatorComponent={ListGapMd}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="mt-10 items-center">
              <ThemedText tone="muted">No reviews yet.</ThemedText>
            </View>
          }
          ListFooterComponent={
            reviews.isFetchingNextPage ? (
              <View className="gap-3 pt-2">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </View>
            ) : null
          }
          ListHeaderComponent={
            <View className="mb-4 flex-row items-center gap-4">
              <View className="size-20 items-center justify-center overflow-hidden rounded-full bg-surface-muted">
                {profile.data.avatarUrl ? (
                  <Image
                    contentFit="cover"
                    source={profile.data.avatarUrl}
                    style={{ width: "100%", height: "100%" }}
                  />
                ) : (
                  <ThemedText size="2xl" weight="medium">
                    {profile.data.displayName.charAt(0).toUpperCase()}
                  </ThemedText>
                )}
              </View>
              <View className="flex-1 gap-1">
                <ThemedText size="2xl" weight="medium">
                  {profile.data.displayName}
                </ThemedText>
                <ThemedText tone="muted">
                  Member since {memberSince(profile.data.joinedAt)}
                </ThemedText>
                <ThemedText weight="semibold">
                  {profile.data.reviewCount}{" "}
                  {profile.data.reviewCount === 1 ? "review" : "reviews"}
                </ThemedText>
              </View>
            </View>
          }
          onEndReached={() => {
            if (reviews.hasNextPage && !reviews.isFetchingNextPage) {
              void reviews.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onRefresh={refresh}
          refreshing={profile.isRefetching || reviews.isRefetching}
          renderItem={({ item }) => (
            <PublicReviewRow
              onPress={(review) =>
                router.push(`/branch/${review.branchId}?source=public_profile`)
              }
              onReport={canReport ? onReportReview : undefined}
              review={item}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}
