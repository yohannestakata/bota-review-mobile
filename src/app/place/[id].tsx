import { useAuth } from "@clerk/clerk-expo";
import { Add01Icon } from "@hugeicons/core-free-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ListErrorState } from "@/components/ui/list-state-placeholder";
import { BackHeader } from "@/components/ui/screen-header";
import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";
import {
  BranchCard,
  BranchListSkeleton,
  usePlace,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import { analytics } from "@/lib/analytics";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";
import { promptSignIn } from "@/lib/auth-gate";

const EMPTY_SAVED = new Set<string>();

export default function PlaceOverviewScreen() {
  const colors = useColors();
  const { isLoaded, isSignedIn } = useAuth();
  const { id } = useLocalSearchParams<{ id: string }>();
  const place = usePlace(id);
  const pull = usePullToRefresh(() => place.refetch());
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      if (!isSignedIn) {
        promptSignIn(isLoaded);
        return;
      }

      const wasSaved = (savedIds ?? EMPTY_SAVED).has(branch.id);
      analytics.track(wasSaved ? "branch_unsaved" : "branch_saved", {
        branch_id: branch.id,
      });
      toggleSave.mutate({ branchId: branch.id, isSaved: wasSaved });
    },
    [isLoaded, isSignedIn, savedIds, toggleSave],
  );

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <BackHeader title={place.data?.name ?? "Locations"} />

      {place.isPending ? (
        <View className="px-6 pt-2">
          <BranchListSkeleton />
        </View>
      ) : place.isError || !place.data ? (
        <ListErrorState
          errorText="Couldn't load these locations. Check your connection and try again."
          onRetry={() => place.refetch()}
        />
      ) : (
        <FlashList
          showsVerticalScrollIndicator={false}
          contentContainerClassName="px-6 pb-10 pt-2"
          data={place.data.branches}
          ItemSeparatorComponent={ListGapLg}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={
            <View className="mb-5 gap-3">
              <ThemedText size="3xl" weight="bold">
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
          ListFooterComponent={
            <Pressable
              className="mt-5 flex-row items-center gap-3 rounded-2xl border border-placeholder p-4"
              onPress={() =>
                router.push({
                  pathname: "/submissions",
                  params: { placeId: id, placeName: place.data.name },
                })
              }
            >
              <AppIcon color={colors.foreground} icon={Add01Icon} size={20} />
              <View className="flex-1">
                <ThemedText weight="medium">Add a location</ThemedText>
                <ThemedText size="sm" tone="muted">
                  Know another {place.data.name} spot? Put it on Bota.
                </ThemedText>
              </View>
            </Pressable>
          }
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
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
