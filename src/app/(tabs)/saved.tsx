import { router } from "expo-router";
import { useCallback } from "react";
import { FlatList, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  BranchListSkeleton,
  useSaves,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import type { BranchCard as BranchCardData } from "@/lib/api";

const EMPTY_SAVED = new Set<string>();

export default function SavedScreen() {
  const saves = useSaves();
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      toggleSave.mutate({
        branchId: branch.id,
        isSaved: (savedIds ?? EMPTY_SAVED).has(branch.id),
      });
    },
    [savedIds, toggleSave],
  );

  const items = saves.data ?? [];

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pb-2 pt-2">
        <ThemedText size="3xl" weight="medium">
          Saved
        </ThemedText>
      </View>

      <FlatList
        contentContainerClassName="gap-5 px-6 pb-10 pt-2"
        data={items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          saves.isPending ? (
            <BranchListSkeleton />
          ) : (
            <View className="mt-24 items-center px-6">
              {saves.isError ? (
                <View className="items-center gap-3">
                  <ThemedText tone="muted">
                    Couldn&apos;t grab your saves.
                  </ThemedText>
                  <Pressable onPress={() => saves.refetch()}>
                    <ThemedText tone="brand" weight="semibold">
                      Try again
                    </ThemedText>
                  </Pressable>
                </View>
              ) : (
                <ThemedText className="text-center" tone="muted">
                  No saves yet. Tap the heart on places you love and
                  they&apos;ll live here.
                </ThemedText>
              )}
            </View>
          )
        }
        onRefresh={() => saves.refetch()}
        refreshing={saves.isFetching && !saves.isPending}
        renderItem={({ item }) => (
          <BranchCard
            branch={item}
            isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
            onPress={(branch) => router.push(`/branch/${branch.id}`)}
            onToggleSave={onToggleSave}
          />
        )}
      />
    </SafeAreaView>
  );
}
