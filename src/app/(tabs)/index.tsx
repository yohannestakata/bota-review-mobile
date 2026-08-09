import { useAuth, useUser } from "@clerk/clerk-expo";
import { UserCircleIcon } from "@hugeicons/core-free-icons";
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
  TastePickerCard,
  useHomeFeed,
  useForYou,
  useSaveHandler,
  useTastePreferences,
} from "@/features/home";
import { Avatar } from "@/components/ui/avatar";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { debugLog } from "@/lib/debug";
import { useLocation } from "@/lib/use-location";

const GREETING_SEED = Math.random();

export default function Index() {
  const { isSignedIn } = useAuth();
  const { user } = useUser();
  const location = useLocation();
  const home = useHomeFeed(location.coords);
  const forYou = useForYou();
  const taste = useTastePreferences();
  const { saved, savedIds, onToggleSave } = useSaveHandler();

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
    void home.refetch();
    if (isSignedIn) void forYou.refetch();
    if (isSignedIn) {
      void saved.refetch();
    }
  }, [forYou, home, isSignedIn, saved]);

  const firstName = user?.firstName ?? "there";
  // Picked once per app launch — varies across opens, stable within a session.
  const greeting = useMemo(
    () => homeGreeting(new Date(), firstName, GREETING_SEED),
    [firstName],
  );
  const allSections = home.data?.sections ?? [];
  const collections = allSections
    .filter((section) => section.type === "curated_collection")
    // A collection needs a real slug to navigate to — falling back to the title
    // routes to /collection/<Title>, which 404s. Drop slugless collections.
    .flatMap((section) =>
      section.slug
        ? [
            {
              slug: section.slug,
              title: section.title,
              coverImageUrl: section.coverImageUrl,
            },
          ]
        : [],
    );
  const branchSections = allSections.filter(
    (section): section is HomeBranchSection =>
      section.type !== "curated_collection",
  );
  const highlyRated = branchSections.find(
    (section) => section.type === "highly_rated",
  );
  // Gently boost the user's picked cuisines up the main feed (client-side, so
  // the shared home cache stays intact).
  const highlyRatedItems = highlyRated?.items ?? [];
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
            refreshing={
              home.isRefetching || (isSignedIn === true && saved.isRefetching)
            }
            tintColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-5 px-6">
          <View className="flex-row items-center justify-between">
            <Pressable
              accessibilityLabel={isSignedIn ? "Open profile" : "Sign in"}
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => router.push(isSignedIn ? "/profile" : "/login")}
            >
              {isSignedIn ? (
                <Avatar
                  name={
                    user?.fullName ??
                    user?.username ??
                    user?.primaryEmailAddress?.emailAddress
                  }
                  size={40}
                  uri={user?.imageUrl}
                />
              ) : (
                <View className="size-11 items-center justify-center rounded-full bg-surface-muted">
                  <AppIcon
                    color={colors.primary}
                    icon={UserCircleIcon}
                    size={24}
                  />
                </View>
              )}
            </Pressable>
            <LocationPill
              label={location.label}
              onPress={() => void location.request()}
              status={location.status}
            />
          </View>
          <ThemedText className="mt-5" size="3xl" tone="heading" weight="bold">
            {greeting}
          </ThemedText>
        </View>

        <View className="mt-6 px-6">
          <HomeSearchBar onPress={() => router.push("/search")} />
        </View>

        {home.isSuccess && !isEmpty && isSignedIn ? (
          <TastePickerCard
            onToggle={taste.toggle}
            picks={taste.tasteOptionIds}
            ready={taste.ready}
          />
        ) : null}

        {home.isPending ? <HomeFeedSkeleton /> : null}

        {home.isError && !home.data ? (
          <View className="mt-24 items-center gap-3 px-6">
            <ThemedText size="xl" tone="heading" weight="bold">
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

        {home.data && home.failureCount > 0 && !home.isFetching ? (
          <View className="mx-6 mt-4 flex-row items-center justify-between gap-3 rounded-2xl bg-surface-muted px-4 py-3">
            <ThemedText className="flex-1" size="sm" tone="muted">
              Showing saved results — couldn&apos;t refresh.
            </ThemedText>
            <Pressable hitSlop={6} onPress={() => home.refetch()}>
              <ThemedText size="sm" tone="brand" weight="semibold">
                Retry
              </ThemedText>
            </Pressable>
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

        {forYou.data && forYou.data.items.length > 0 ? (
          <HomeSection
            onPressBranch={(branch) =>
              router.push(`/branch/${branch.id}?source=home`)
            }
            onToggleSave={onToggleSave}
            savedIds={savedIds}
            section={forYou.data}
          />
        ) : null}

        {railSections.map((section) => (
          <HomeSection
            key={section.type}
            onPressBranch={(branch) =>
              router.push(`/branch/${branch.id}?source=home`)
            }
            onToggleSave={onToggleSave}
            savedIds={savedIds}
            section={section}
          />
        ))}

        {home.isSuccess && highlyRatedItems.length > 0 ? (
          <View className="mt-10 gap-4 px-6">
            <View className="gap-1">
              <ThemedText size="xl" tone="heading" weight="bold">
                Highly rated
              </ThemedText>
              <ThemedText tone="muted">
                Well-loved spots with the reviews to back it up.
              </ThemedText>
            </View>
            {highlyRatedItems.map((branch) => (
              <BranchCard
                branch={branch}
                isSaved={savedIds.has(branch.id)}
                key={branch.id}
                onPress={(b) => router.push(`/branch/${b.id}?source=home`)}
                onToggleSave={onToggleSave}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
