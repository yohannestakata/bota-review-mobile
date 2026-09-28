import { useAuth } from "@clerk/clerk-expo";
import { FavouriteIcon } from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { useCallback } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AuthRequiredScreen } from "@/components/auth/auth-required-screen";
import { EmptyState } from "@/components/ui/empty-state";
import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { ListStatePlaceholder } from "@/components/ui/list-state-placeholder";
import { ThemedText } from "@/components/ui/themed-text";
import {
  BranchCard,
  BranchListSkeleton,
  useSaves,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import { analytics } from "@/lib/analytics";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

const EMPTY_SAVED = new Set<string>();

export default function SavedScreen() {
  const { isSignedIn } = useAuth();
  const saves = useSaves();
  const pull = usePullToRefresh(() => saves.refetch());
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      const wasSaved = (savedIds ?? EMPTY_SAVED).has(branch.id);
      analytics.track(wasSaved ? "branch_unsaved" : "branch_saved", {
        branch_id: branch.id,
      });
      toggleSave.mutate({ branchId: branch.id, isSaved: wasSaved });
    },
    [savedIds, toggleSave],
  );

  const items = saves.data ?? [];

  if (!isSignedIn) {
    return (
      <AuthRequiredScreen
        body="Sign in to keep a personal list of places you want to try again."
        title="Your saved places live here"
      />
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="px-6 pb-2" style={{ paddingTop: 20 }}>
        <ThemedText size="3xl" weight="bold">
          Saved
        </ThemedText>
      </View>

      <FlashList
        showsVerticalScrollIndicator={false}
        contentContainerClassName="px-6 pb-10 pt-2"
        data={items}
        ItemSeparatorComponent={ListGapLg}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <ListStatePlaceholder
            empty={
              <EmptyState
                action={{
                  label: "Find places to save",
                  onPress: () => router.navigate("/"),
                }}
                body="Tap the heart on any place and it'll wait for you here."
                icon={FavouriteIcon}
                secondaryAction={{
                  label: "Search nearby",
                  onPress: () => router.navigate("/search"),
                }}
                title="Nothing saved yet"
              />
            }
            errorText="Couldn't grab your saves."
            isError={saves.isError}
            isPending={saves.isPending}
            onRetry={() => saves.refetch()}
            skeleton={<BranchListSkeleton />}
          />
        }
        onRefresh={pull.onRefresh}
        refreshing={pull.refreshing}
        renderItem={({ item }) => (
          <BranchCard
            branch={item}
            isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
            onPress={(branch) =>
              router.push(`/branch/${branch.id}?source=saved`)
            }
            onToggleSave={onToggleSave}
          />
        )}
      />
    </SafeAreaView>
  );
}
