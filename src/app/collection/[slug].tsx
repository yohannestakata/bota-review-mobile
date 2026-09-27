import { SpoonAndForkIcon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackHeader } from "@/components/ui/screen-header";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  BranchListSkeleton,
  useCollection,
  useSaveHandler,
} from "@/features/home";
import { analytics } from "@/lib/analytics";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

export default function CollectionScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const collection = useCollection(slug);
  const pull = usePullToRefresh(() => collection.refetch());
  const { savedIds, onToggleSave } = useSaveHandler();

  useEffect(() => {
    if (slug) {
      analytics.track("collection_viewed", { collection_slug: slug });
    }
  }, [slug]);

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title={collection.data?.name ?? "Collection"} />

      {collection.isPending ? (
        <View className="px-6 pt-2">
          <BranchListSkeleton />
        </View>
      ) : collection.isError || !collection.data ? (
        <ListErrorState
          errorText="Couldn't load this collection. Check your connection and try again."
          onRetry={() => collection.refetch()}
        />
      ) : (
        <FlashList
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-10 pt-2"
          data={collection.data.branches}
          ItemSeparatorComponent={ListGapLg}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <EmptyState
              action={{
                label: "Explore other picks",
                onPress: () => router.navigate("/"),
              }}
              body="We're still filling this one up. In the meantime, there's plenty more to discover."
              icon={SpoonAndForkIcon}
              title="Coming together"
            />
          }
          ListHeaderComponent={
            collection.data.description ? (
              <ThemedText className="mb-5 leading-6" tone="muted">
                {collection.data.description}
              </ThemedText>
            ) : null
          }
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
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
