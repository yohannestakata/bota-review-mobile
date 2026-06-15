import { useClerk, useUser } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { PencilEdit02Icon, Share08Icon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  Share,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useDeleteReview } from "@/features/branch";
import { useSavedBranchIds } from "@/features/home";
import {
  MyReviewRow,
  useMe,
  useMyReviews,
  type MyReview,
} from "@/features/profile";

function ProfileHeader({ reviewCount }: { reviewCount: number }) {
  const { user } = useUser();
  const me = useMe();
  const { data: savedIds } = useSavedBranchIds();

  const name = user?.fullName ?? user?.firstName ?? "You";
  const handle =
    user?.username ?? user?.primaryEmailAddress?.emailAddress ?? "";
  const trustLevel = me.data?.trustLevel;
  const role = me.data?.role;
  const savedCount = savedIds?.size ?? 0;

  return (
    <View className="pb-1">
      <View className="flex-row items-center gap-4">
        <Avatar name={name} size={64} uri={user?.imageUrl} />

        <View className="flex-1 gap-1">
          <View className="flex-row items-center justify-between">
            <ThemedText
              className="flex-1 pr-2"
              numberOfLines={1}
              size="xl"
              weight="semibold"
            >
              {name}
            </ThemedText>
            <Pressable
              className="flex-row items-center gap-1"
              hitSlop={8}
              onPress={() => router.push("/profile/edit")}
            >
              <AppIcon color={colors.foreground} icon={PencilEdit02Icon} size={16} />
              <ThemedText size="sm" weight="medium">
                Edit
              </ThemedText>
            </Pressable>
          </View>

          <View className="flex-row items-center gap-2">
            {handle ? (
              <ThemedText className="shrink" numberOfLines={1} tone="muted">
                {handle}
              </ThemedText>
            ) : null}
            {trustLevel ? (
              <View className="rounded-full bg-neutral-100 px-2 py-0.5">
                <ThemedText size="xs" tone="muted" weight="medium">
                  {trustLevel}
                </ThemedText>
              </View>
            ) : null}
            {role && role !== "user" ? (
              <View className="rounded-full bg-black px-2 py-0.5">
                <ThemedText size="xs" tone="inverse" weight="medium">
                  {role}
                </ThemedText>
              </View>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row gap-3">
        <View className="flex-1 items-center justify-center gap-0.5 rounded-2xl border border-neutral-100 bg-white py-3">
          <ThemedText size="xl" weight="semibold">
            {reviewCount}
          </ThemedText>
          <ThemedText size="sm" tone="muted">
            Reviews
          </ThemedText>
        </View>
        <View className="flex-1 items-center justify-center gap-0.5 rounded-2xl border border-neutral-100 bg-white py-3">
          <ThemedText size="xl" weight="semibold">
            {savedCount}
          </ThemedText>
          <ThemedText size="sm" tone="muted">
            Saved
          </ThemedText>
        </View>
        <Pressable
          className="flex-1 items-center justify-center gap-1 rounded-2xl border border-neutral-100 bg-white py-3"
          onPress={() =>
            void Share.share({
              message: `See my food finds on Bota — ${name}`,
            })
          }
        >
          <AppIcon color={colors.foreground} icon={Share08Icon} size={22} />
          <ThemedText size="sm" weight="medium">
            Share
          </ThemedText>
        </Pressable>
      </View>

      <View className="my-5 h-px bg-neutral-100" />

      <ThemedText size="lg" weight="semibold">
        Your reviews
      </ThemedText>
    </View>
  );
}

export default function ProfileScreen() {
  const { signOut } = useClerk();
  const reviews = useMyReviews();
  const deleteReview = useDeleteReview();
  const [loggingOut, setLoggingOut] = useState(false);

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
    Alert.alert("Delete review?", "This will remove your review.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () =>
          deleteReview.mutate({
            reviewId: review.id,
            branchId: review.branchId,
          }),
      },
    ]);
  }

  async function onLogout() {
    if (loggingOut) {
      return;
    }
    setLoggingOut(true);
    try {
      await signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }

  const items = reviews.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <FlatList
        contentContainerClassName="gap-4 px-6 pb-10 pt-4"
        data={items}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={<ProfileHeader reviewCount={items.length} />}
        ListEmptyComponent={
          <View className="mt-8 items-center px-6">
            {reviews.isPending ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <ThemedText className="text-center" tone="muted">
                No reviews yet — go share a hot take.
              </ThemedText>
            )}
          </View>
        }
        ListFooterComponent={
          <Button
            className="mt-8"
            label="Log out"
            loading={loggingOut}
            onPress={onLogout}
            variant="secondary"
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
