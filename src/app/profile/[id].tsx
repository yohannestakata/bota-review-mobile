import { PencilEdit02Icon, UserCircleIcon } from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/ui/screen-header";
import { Alert } from "@/components/ui/alert";
import { EmptyState } from "@/components/ui/empty-state";
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
                Alert.alert("Got it", "Thanks for keeping Bota helpful."),
              onError: (error) =>
                Alert.alert("Couldn't send report", getErrorMessage(error)),
            },
          ),
      },
    ]);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title="Reviewer" />

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
        <EmptyState
          action={{ label: "Try again", onPress: refresh }}
          body="Check your connection and try again. If this reviewer deleted their account, their profile won't load."
          icon={UserCircleIcon}
          secondaryAction={{ label: "Go back", onPress: () => router.back() }}
          title="Couldn't load this profile"
        />
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-12 pt-4"
          data={reviewItems}
          ItemSeparatorComponent={ListGapMd}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              body="This reviewer hasn't shared any takes yet."
              className="mt-10"
              icon={PencilEdit02Icon}
              title="No reviews yet"
            />
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
                <ThemedText size="2xl" weight="bold">
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
