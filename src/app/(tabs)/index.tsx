import { useUser } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { router } from "expo-router";
import { useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BranchCard,
  CollectionCircles,
  HomeSearchBar,
  HomeSection,
  LocationPill,
  useHomeFeed,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import { useNearby } from "@/features/search";
import { Avatar } from "@/components/ui/avatar";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { debugLog } from "@/lib/debug";
import { useLocation } from "@/lib/use-location";

const EMPTY_SAVED = new Set<string>();

export default function Index() {
  const { user } = useUser();
  const home = useHomeFeed();
  const saved = useSavedBranchIds();
  const savedIds = saved.data;
  const toggleSave = useToggleSave();
  const location = useLocation();
  const nearby = useNearby(location.coords);

  useEffect(() => {
    if (nearby.data) {
      debugLog("home", "near you results", {
        from: location.coords,
        count: nearby.data.length,
        items: nearby.data.map((b) => ({
          name: b.placeName,
          neighborhood: b.neighborhood?.name,
          km: b.distanceKm,
        })),
      });
    }
  }, [nearby.data, location.coords]);

  const onRefresh = useCallback(() => {
    void Promise.all([home.refetch(), saved.refetch()]);
  }, [home, saved]);

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      toggleSave.mutate({
        branchId: branch.id,
        isSaved: (savedIds ?? EMPTY_SAVED).has(branch.id),
      });
    },
    [savedIds, toggleSave],
  );

  const firstName = user?.firstName ?? "there";
  const allSections = home.data?.sections ?? [];
  const collections = allSections
    .filter((section) => section.type === "curated_collection")
    .map((section) => ({
      slug: section.slug ?? section.title,
      title: section.title,
      coverImageUrl: section.coverImageUrl,
    }));
  const highlyRated = allSections.find(
    (section) => section.type === "highly_rated",
  );
  const nearbyItems = nearby.data ?? [];
  const isEmpty =
    collections.length === 0 &&
    nearbyItems.length === 0 &&
    (highlyRated?.items.length ?? 0) === 0;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerClassName="pb-10"
        refreshControl={
          <RefreshControl
            onRefresh={onRefresh}
            refreshing={home.isRefetching || saved.isRefetching}
            tintColor={colors.foreground}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-6 px-6">
          <View className="flex-row items-center justify-between">
            <Pressable hitSlop={8} onPress={() => router.push("/profile")}>
              <Avatar name={user?.fullName} size={40} uri={user?.imageUrl} />
            </Pressable>
            <LocationPill
              label={location.label}
              onPress={() => void location.request()}
              status={location.status}
            />
          </View>
          <ThemedText className="mt-4" size="3xl" weight="medium">
            Hey {firstName}, what are you craving?
          </ThemedText>
        </View>

        <View className="mt-6 px-6">
          <HomeSearchBar onPress={() => router.push("/search")} />
        </View>

        {home.isPending ? (
          <View className="mt-24 items-center">
            <ActivityIndicator color={colors.foreground} />
          </View>
        ) : null}

        {home.isError ? (
          <View className="mt-24 items-center gap-3 px-6">
            <ThemedText size="lg" weight="medium">
              Well, this is awkward
            </ThemedText>
            <ThemedText className="text-center" tone="muted">
              The feed didn&apos;t load. Mind giving it another go?
            </ThemedText>
            <Pressable onPress={() => home.refetch()}>
              <ThemedText tone="brand" weight="semibold">
                Try again
              </ThemedText>
            </Pressable>
          </View>
        ) : null}

        {home.isSuccess && isEmpty ? (
          <View className="mt-24 items-center px-6">
            <ThemedText tone="muted">
              It&apos;s a little quiet here — tasty spots are on the way.
            </ThemedText>
          </View>
        ) : null}

        {home.isSuccess && collections.length > 0 ? (
          <View className="mt-6">
            <CollectionCircles
              items={collections}
              onPress={(slug) => router.push(`/collection/${slug}`)}
            />
          </View>
        ) : null}

        {nearbyItems.length > 0 ? (
          <HomeSection
            onPressBranch={(branch) => router.push(`/branch/${branch.id}`)}
            onToggleSave={onToggleSave}
            savedIds={savedIds ?? EMPTY_SAVED}
            section={{
              type: "highly_rated",
              title: "Near you",
              items: nearbyItems,
            }}
          />
        ) : null}

        {home.isSuccess && highlyRated && highlyRated.items.length > 0 ? (
          <View className="mt-8 gap-4 px-6">
            <ThemedText size="xl" weight="semibold">
              Highly rated
            </ThemedText>
            {highlyRated.items.map((branch) => (
              <BranchCard
                branch={branch}
                isSaved={(savedIds ?? EMPTY_SAVED).has(branch.id)}
                key={branch.id}
                onPress={(b) => router.push(`/branch/${b.id}`)}
                onToggleSave={onToggleSave}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
