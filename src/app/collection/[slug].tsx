import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { BackButton } from "@/components/ui/back-button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  BranchListSkeleton,
  useCollection,
  useSaveHandler,
} from "@/features/home";
import { analytics } from "@/lib/analytics";

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const collection = useCollection(slug);
  const { savedIds, onToggleSave } = useSaveHandler();

  useEffect(() => {
    if (slug) {
      analytics.track("collection_viewed", { collection_slug: slug });
    }
  }, [slug]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <ThemedText numberOfLines={1} size="xl" weight="bold">
          {collection.data?.name ?? "Collection"}
        </ThemedText>
      </View>

      {collection.isPending ? (
        <View className="px-6 pt-2">
          <BranchListSkeleton />
        </View>
      ) : collection.isError || !collection.data ? (
        <View className="mt-24 items-center gap-3 px-6">
          <ThemedText tone="muted">
            Couldn&apos;t load this collection.
          </ThemedText>
          <Pressable onPress={() => collection.refetch()}>
            <ThemedText tone="brand" weight="semibold">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-10 pt-2"
          data={collection.data.branches}
          ItemSeparatorComponent={ListGapLg}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View className="mt-24 items-center px-6">
              <ThemedText className="text-center" tone="muted">
                Nothing in this collection yet — check back soon.
              </ThemedText>
            </View>
          }
          ListHeaderComponent={
            collection.data.description ? (
              <ThemedText className="mb-5 leading-6" tone="muted">
                {collection.data.description}
              </ThemedText>
            ) : null
          }
          onRefresh={() => collection.refetch()}
          refreshing={collection.isRefetching}
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              isSaved={savedIds.has(item.id)}
              onPress={(branch) =>
                router.push(`/branch/${branch.id}?source=collection`)
              }
              onToggleSave={onToggleSave}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
