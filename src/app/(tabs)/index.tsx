import { useUser } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo } from "react";
import { Pressable, RefreshControl, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  BranchCard,
  CollectionCircles,
  HomeFeedSkeleton,
  type HomeBranchSection,
  HomeSearchBar,
  HomeSection,
  homeGreeting,
  LocationPill,
  useHomeFeed,
  useSavedBranchIds,
  useToggleSave,
} from "@/features/home";
import { Avatar } from "@/components/ui/avatar";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { debugLog } from "@/lib/debug";
import { useLocation } from "@/lib/use-location";

const EMPTY_SAVED = new Set<string>();

export default function Index() {
  const { user } = useUser();
  const location = useLocation();
  const home = useHomeFeed(location.coords);
  const saved = useSavedBranchIds();
  const savedIds = saved.data;
  const toggleSave = useToggleSave();

  useEffect(() => {
    if (home.data) {
      debugLog("home", "feed loaded", {
        from: location.coords,
        sections: home.data.sections.map((section) => ({
          type: section.type,
          count: "items" in section ? section.items.length : undefined,
        })),
      });
    }
  }, [home.data, location.coords]);

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
  // Picked once per app launch — varies across opens, stable within a session.
  const greeting = useMemo(
    () => homeGreeting(new Date(), firstName, Math.random()),
    [firstName],
  );
  const allSections = home.data?.sections ?? [];
  const collections = allSections
    .filter((section) => section.type === "curated_collection")
    .map((section) => ({
      slug: section.slug ?? section.title,
      title: section.title,
      coverImageUrl: section.coverImageUrl,
    }));
  const branchSections = allSections.filter(
    (section): section is HomeBranchSection =>
      section.type !== "curated_collection",
  );
  const highlyRated = branchSections.find(
    (section) => section.type === "highly_rated",
  );
  const railSections = branchSections.filter(
    (section) => section.type !== "highly_rated" && section.items.length > 0,
  );
  const isEmpty =
    collections.length === 0 &&
    branchSections.every((section) => section.items.length === 0);

  return (
    <SafeAreaView
      className="flex-1 bg-background"
      edges={["top", "left", "right"]}
    >
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
            {greeting}
          </ThemedText>
        </View>

        <View className="mt-6 px-6">
          <HomeSearchBar onPress={() => router.push("/search")} />
        </View>

        {home.isPending ? <HomeFeedSkeleton /> : null}

        {home.isError && !home.data ? (
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

        {railSections.map((section) => (
          <HomeSection
            key={section.type}
            onPressBranch={(branch) => router.push(`/branch/${branch.id}`)}
            onToggleSave={onToggleSave}
            savedIds={savedIds ?? EMPTY_SAVED}
            section={section}
          />
        ))}

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
