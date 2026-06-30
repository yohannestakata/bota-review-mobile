import { useAuth } from "@clerk/clerk-expo";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { BackButton } from "@/components/ui/back-button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  BranchListSkeleton,
  usePlace,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import { analytics } from "@/lib/analytics";
import type { BranchCard as BranchCardData } from "@/lib/api";

const EMPTY_SAVED = new Set<string>();

export default function PlaceOverviewScreen() {
  const { isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      if (!isSignedIn) {
        router.push("/login");
        return;
      }

      const wasSaved = (savedIds ?? EMPTY_SAVED).has(branch.id);
      analytics.track(wasSaved ? "branch_unsaved" : "branch_saved", {
        branch_id: branch.id,
      });
      toggleSave.mutate({ branchId: branch.id, isSaved: wasSaved });
    },
    [isSignedIn, savedIds, toggleSave],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="flex-row items-center gap-3 px-4 py-3">
        <BackButton onPress={() => router.back()} />
        <ThemedText
          className="shrink"
          numberOfLines={1}
          size="lg"
          weight="semibold"
        >
          {place.data?.name ?? "Locations"}
        </ThemedText>
      </View>

      {place.isPending ? (
        <View className="px-6 pt-2">
          <BranchListSkeleton />
        </View>
      ) : place.isError || !place.data ? (
        <View className="mt-24 items-center gap-3 px-6">
          <ThemedText tone="muted">
            Couldn&apos;t load these locations.
          </ThemedText>
          <Pressable onPress={() => place.refetch()}>
            <ThemedText tone="brand" weight="semibold">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-10 pt-2"
          data={place.data.branches}
          ItemSeparatorComponent={ListGapLg}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View className="mb-5 gap-3">
              <ThemedText size="3xl" weight="medium">
                {place.data.name}
              </ThemedText>
              {place.data.description ? (
                <ThemedText className="leading-6" tone="muted">
                  {place.data.description}
                </ThemedText>
              ) : null}
              <ThemedText weight="semibold">
                {place.data.branchCount}{" "}
                {place.data.branchCount === 1 ? "location" : "locations"}
              </ThemedText>
            </View>
          }
          onRefresh={() => place.refetch()}
          refreshing={place.isRefetching}
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
              onPress={(branch) =>
                router.push(`/branch/${branch.id}?source=place_overview`)
              }
              onToggleSave={onToggleSave}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
}
