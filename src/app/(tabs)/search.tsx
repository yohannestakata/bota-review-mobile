import {
  Cancel01Icon,
  FilterHorizontalIcon,
  ListViewIcon,
  MapsIcon,
  Search01Icon,
  SpoonAndForkIcon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { ChipButton, TextButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { AppIcon } from "@/components/ui/huge-icon";
import {
  ListErrorState,
  StaleDataBanner,
} from "@/components/ui/list-state-placeholder";
import { ThemedText } from "@/components/ui/themed-text";
import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { BranchCard, useSaveHandler } from "@/features/home";
import {
  FilterSheet,
  type FilterSheetRef,
  SearchResultsSkeleton,
  SearchSuggestions,
  SearchMap,
  useSearch,
  type SearchSort,
} from "@/features/search";
import { useCuisines, useNeighborhoods, useTags } from "@/features/taxonomy";
import { analytics } from "@/lib/analytics";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useDeviceList } from "@/lib/use-device-list";
import { useLocation } from "@/lib/use-location";
import { usePullToRefresh } from "@/lib/use-pull-to-refresh";

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

export default function SearchScreen() {
  const colors = useColors();
  const [text, setText] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<string>();
  const [cuisineIds, setCuisineIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [sort, setSort] = useState<Exclude<SearchSort, "distance">>("rating");
  const [openNow, setOpenNow] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  // The visible map area, set as the map moves; cleared when leaving the map.
  const [area, setArea] = useState<
    [number, number, number, number] | undefined
  >(undefined);
  const [nearby, setNearby] = useState(false);
  const filterSheetRef = useRef<FilterSheetRef>(null);

  const debouncedQ = useDebouncedValue(text.trim(), 300);
  const neighborhoods = useNeighborhoods();
  const cuisines = useCuisines();
  const tags = useTags();
  const { coords, status, request } = useLocation();
  const { savedIds, onToggleSave } = useSaveHandler();
  // Only committed searches are remembered (a result opened, or the search key
  // pressed) — never half-typed prefixes like "Tom".
  const recentSearches = useDeviceList<string>("recent-searches", {
    max: 6,
    idOf: (query) => query.toLowerCase(),
  });
  // A refined search replaces its own prefixes ("Enrico" supersedes "En" and
  // "Enri"), so Recent doesn't fill up with half-typed variants.
  function rememberSearch(query: string) {
    const q = query.trim();
    if (q.length < 3) return;
    const lower = q.toLowerCase();
    recentSearches.items
      .map((item) => item.toLowerCase())
      .filter((item) => lower.startsWith(item) || item.startsWith(lower))
      .forEach((item) => recentSearches.remove(item));
    recentSearches.add(q);
  }

  // "Nearby" only sorts by distance once we actually have coordinates.
  const sortByDistance = nearby && coords != null;
  // Waiting on a granted-but-not-yet-resolved location fix.
  const nearbyPending = nearby && coords == null && status !== "denied";

  // If location is revoked/unavailable with no usable fix, don't leave the
  // "Nearby" chip looking active while the sort has quietly fallen back to
  // rating — turn it off and say why. (Stale coords keep working as-is.)
  useEffect(() => {
    if (nearby && coords == null && status === "denied") {
      setNearby(false);
      Alert.alert(
        "Location is off",
        "Turn location back on to sort by distance.",
      );
    }
  }, [nearby, coords, status]);

  const params = useMemo(
    () => ({
      q: debouncedQ,
      neighborhoodId,
      cuisineId: cuisineIds.length > 0 ? cuisineIds : undefined,
      tagId: tagIds.length > 0 ? tagIds : undefined,
      openNow: openNow || undefined,
      sort: sortByDistance ? ("distance" as const) : sort,
      lat: coords?.lat,
      lng: coords?.lng,
      bbox: area,
    }),
    [
      debouncedQ,
      neighborhoodId,
      cuisineIds,
      tagIds,
      openNow,
      sortByDistance,
      sort,
      coords?.lat,
      coords?.lng,
      area,
    ],
  );

  async function toggleNearby() {
    if (nearby) {
      setNearby(false);
      return;
    }

    if (coords == null && !(await request())) {
      Alert.alert(
        "Need your neighborhood radar",
        "Turn on location access and we'll find nearby spots.",
      );
      return;
    }

    setNearby(true);
  }

  const search = useSearch(params);
  const pull = usePullToRefresh(() => search.refetch());
  const filterCount =
    (neighborhoodId ? 1 : 0) +
    cuisineIds.length +
    tagIds.length +
    (sort === "rating" ? 0 : 1);
  const hasFilters = filterCount > 0 || openNow || nearby;
  const active =
    debouncedQ.length >= 2 ||
    filterCount > 0 ||
    openNow ||
    sortByDistance ||
    Boolean(area);
  const resultPages = search.data?.pages;
  const results = useMemo(() => {
    const unique = new Map<string, BranchCardData>();
    resultPages?.flat().forEach((branch) => unique.set(branch.id, branch));
    return [...unique.values()];
  }, [resultPages]);
  const firstPageCount = search.data?.pages[0]?.length ?? 0;

  // One event per map-area load, once its results are in.
  const trackedArea = useRef<string | null>(null);
  useEffect(() => {
    if (!area || search.isFetching) return;
    const key = area.join(",");
    if (trackedArea.current === key) return;
    trackedArea.current = key;
    analytics.track("map_area_searched", { result_count: results.length });
  }, [area, search.isFetching, results.length]);

  // search_submitted / search_no_results — fire once per settled query (not per
  // keystroke), only for real text searches of 2+ characters.
  const lastTracked = useRef<string>("");
  useEffect(() => {
    if (
      debouncedQ.length < 2 ||
      !search.isSuccess ||
      search.isPlaceholderData
    ) {
      return;
    }
    const key = JSON.stringify(params);
    if (lastTracked.current === key) {
      return;
    }
    lastTracked.current = key;

    analytics.track("search_submitted", {
      query: debouncedQ,
      result_count: firstPageCount,
    });
    if (firstPageCount === 0) {
      analytics.track("search_no_results", {
        query: debouncedQ,
        filters: {
          neighborhoodId: neighborhoodId ?? null,
          cuisineIds,
          tagIds,
          openNow,
          sort,
        },
      });
    }
  }, [
    debouncedQ,
    search.isSuccess,
    search.isPlaceholderData,
    firstPageCount,
    params,
    neighborhoodId,
    cuisineIds,
    tagIds,
    openNow,
    sort,
  ]);

  function clearFilters() {
    setNeighborhoodId(undefined);
    setCuisineIds([]);
    setTagIds([]);
    setSort("rating");
    setOpenNow(false);
    setNearby(false);
    setArea(undefined);
  }

  // Removable chips for each applied sheet filter (neighborhood/cuisine/tag).
  // Tapping a chip clears just that filter; Open now / Nearby keep their
  // own toggle chips in the row above.
  const activeChips: { key: string; label: string; onRemove: () => void }[] =
    [];
  if (area) {
    activeChips.push({
      key: "area",
      label: "This map area",
      onRemove: () => setArea(undefined),
    });
  }
  if (neighborhoodId) {
    const match = neighborhoods.data?.find((n) => n.id === neighborhoodId);
    activeChips.push({
      key: "neighborhood",
      label: match?.name ?? "Neighborhood",
      onRemove: () => {
        analytics.track("filter_applied", {
          filter_type: "neighborhood",
          filter_value: neighborhoodId,
        });
        setNeighborhoodId(undefined);
      },
    });
  }
  cuisineIds.forEach((id) => {
    const match = cuisines.data?.find((c) => c.id === id);
    activeChips.push({
      key: `cuisine-${id}`,
      label: match?.name ?? "Cuisine",
      onRemove: () => setCuisineIds((prev) => prev.filter((x) => x !== id)),
    });
  });
  tagIds.forEach((id) => {
    const match = tags.data?.find((t) => t.id === id);
    activeChips.push({
      key: `tag-${id}`,
      label: match?.name ?? "Tag",
      onRemove: () => setTagIds((prev) => prev.filter((x) => x !== id)),
    });
  });
  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="gap-3 px-6 pb-2 pt-2">
        <View className="h-14 flex-row items-center gap-2 rounded-full border border-placeholder bg-surface px-5">
          <AppIcon color={colors.muted} icon={Search01Icon} size={22} />
          <TextInput
            maxFontSizeMultiplier={1.6}
            className="flex-1 font-outfit text-md text-foreground"
            onChangeText={setText}
            placeholder="Coffee? Injera?"
            onSubmitEditing={() => {
              const query = text.trim();
              rememberSearch(query);
            }}
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            value={text}
          />
          {text.length > 0 ? (
            <Pressable
              accessibilityLabel="Clear search"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setText("")}
            >
              <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          {/* Styled to match ChipButton (selected = filled) so it reads as part
              of the same row as Nearby / Open now. */}
          <Pressable
            accessibilityRole="button"
            className={`flex-row items-center gap-2 rounded-full px-4 py-2 ${
              filterCount > 0
                ? "bg-primary"
                : "border border-placeholder bg-surface"
            }`}
            onPress={() => filterSheetRef.current?.present()}
          >
            <AppIcon
              color={filterCount > 0 ? colors.inverse : colors.foreground}
              icon={FilterHorizontalIcon}
              size={16}
            />
            <ThemedText
              size="sm"
              tone={filterCount > 0 ? "inverse" : "default"}
              weight="medium"
            >
              {filterCount > 0 ? `Filters · ${filterCount}` : "Filters"}
            </ThemedText>
          </Pressable>

          <ChipButton
            label="Nearby"
            onPress={() => {
              haptics.select();
              void toggleNearby();
            }}
            selected={nearby}
          />

          <ChipButton
            label="Open now"
            onPress={() => {
              haptics.select();
              setOpenNow((v) => !v);
            }}
            selected={openNow}
          />

          {/* List / Map toggle, pushed to the end of the row. */}
          <Pressable
            accessibilityLabel={view === "map" ? "Show list" : "Show map"}
            accessibilityRole="button"
            className="size-10 items-center justify-center rounded-full border border-placeholder bg-surface"
            style={{ marginLeft: "auto" }}
            hitSlop={4}
            onPress={() => {
              haptics.select();
              const next = view === "map" ? "list" : "map";
              analytics.track("search_view_changed", { view: next });
              setView(next);
              setArea(undefined);
            }}
          >
            <AppIcon
              color={colors.foreground}
              icon={view === "map" ? ListViewIcon : MapsIcon}
              size={18}
            />
          </Pressable>
        </View>

        {activeChips.length > 0 ? (
          <ScrollView
            contentContainerClassName="gap-2"
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
          >
            {activeChips.map((chip) => (
              <Pressable
                accessibilityLabel={`Remove ${chip.label} filter`}
                accessibilityRole="button"
                className="flex-row items-center gap-1.5 rounded-full border border-placeholder bg-surface px-4 py-2"
                hitSlop={4}
                key={chip.key}
                onPress={chip.onRemove}
              >
                <ThemedText size="sm" weight="medium">
                  {chip.label}
                </ThemedText>
                <AppIcon color={colors.muted} icon={Cancel01Icon} size={14} />
              </Pressable>
            ))}
          </ScrollView>
        ) : null}
      </View>

      {view === "map" ? (
        <SearchMap
          onOpen={(branch) => {
            rememberSearch(debouncedQ);
            router.push(`/branch/${branch.id}?source=search_map`);
          }}
          areaActive={Boolean(area)}
          loading={search.isFetching && !search.isFetchingNextPage}
          onSearchArea={setArea}
          results={results}
        />
      ) : (
        <FlashList
          contentContainerClassName="px-6 pb-10 pt-2"
          showsVerticalScrollIndicator={false}
          data={results}
          ItemSeparatorComponent={ListGapLg}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            nearbyPending ? (
              <View className="mt-24 items-center px-6">
                <ThemedText className="text-center" tone="muted">
                  Finding places near you…
                </ThemedText>
              </View>
            ) : search.isPending ? (
              <SearchResultsSkeleton belowSuggestions={!active} />
            ) : search.isError ? (
              <ListErrorState
                errorText="Couldn't load places. Check your connection and try again."
                onRetry={() => search.refetch()}
              />
            ) : !active ? (
              <EmptyState
                action={{
                  label: "Suggest a place",
                  onPress: () => router.navigate("/submissions"),
                }}
                body="Know a great spot? Add it and we'll get it listed."
                icon={SpoonAndForkIcon}
                title="No places yet"
              />
            ) : (
              <EmptyState
                action={
                  hasFilters
                    ? { label: "Clear filters", onPress: clearFilters }
                    : undefined
                }
                body={
                  debouncedQ.length >= 2
                    ? "Check the spelling, or if it's not on Bota yet, add it and help everyone find it."
                    : "Try loosening a filter or two."
                }
                icon={Search01Icon}
                secondaryAction={
                  debouncedQ.length >= 2
                    ? {
                        label: `Add "${debouncedQ}" to Bota`,
                        onPress: () =>
                          router.navigate({
                            pathname: "/submissions",
                            params: { placeName: debouncedQ },
                          }),
                      }
                    : undefined
                }
                title={
                  debouncedQ.length >= 2
                    ? `No matches for "${debouncedQ}"`
                    : "No places match these filters"
                }
              />
            )
          }
          ListHeaderComponent={
            !active || results.length > 0 ? (
              <View className="mb-5 gap-3">
                {!active ? (
                  <SearchSuggestions
                    cuisines={(cuisines.data ?? []).slice(0, 8)}
                    onClearRecent={recentSearches.clear}
                    onPickCuisine={(id) => {
                      analytics.track("filter_applied", {
                        filter_type: "cuisine",
                        filter_value: id,
                      });
                      setCuisineIds([id]);
                    }}
                    onPickRecent={setText}
                    recent={recentSearches.items}
                  />
                ) : null}
                {results.length > 0 &&
                search.failureCount > 0 &&
                !search.isFetching &&
                !search.isFetchNextPageError ? (
                  <StaleDataBanner onRetry={() => search.refetch()} />
                ) : null}
                {results.length > 0 ? (
                  <ThemedText size="xl" weight="bold">
                    {active ? "Results" : "Explore places"}
                  </ThemedText>
                ) : null}
              </View>
            ) : null
          }
          ListFooterComponent={
            search.isFetchingNextPage ? (
              <View className="items-center py-6">
                <ActivityIndicator color={colors.foreground} />
              </View>
            ) : search.isFetchNextPageError ? (
              <View className="items-center gap-2 py-6">
                <ThemedText size="sm" tone="muted">
                  Couldn&apos;t load more places.
                </ThemedText>
                <TextButton
                  label="Try again"
                  onPress={() => void search.fetchNextPage()}
                />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (
              search.hasNextPage &&
              !search.isFetchingNextPage &&
              !search.isPlaceholderData
            ) {
              void search.fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.4}
          onRefresh={pull.onRefresh}
          refreshing={pull.refreshing}
          renderItem={({ item }) => (
            <BranchCard
              branch={item}
              isSaved={savedIds.has(item.id)}
              onPress={(branch) => {
                rememberSearch(debouncedQ);
                router.push(`/branch/${branch.id}?source=search`);
              }}
              onToggleSave={onToggleSave}
            />
          )}
        />
      )}

      <FilterSheet
        ref={filterSheetRef}
        cuisineIds={cuisineIds}
        cuisines={cuisines.data ?? []}
        neighborhoodId={neighborhoodId}
        neighborhoods={neighborhoods.data ?? []}
        onClear={clearFilters}
        onSelectNeighborhood={(id) => {
          analytics.track("filter_applied", {
            filter_type: "neighborhood",
            filter_value: id,
          });
          setNeighborhoodId((current) => (current === id ? undefined : id));
        }}
        onSelectSort={(value) => {
          analytics.track("filter_applied", {
            filter_type: "sort",
            filter_value: value,
          });
          setSort(value);
        }}
        onToggleCuisine={(id) => {
          analytics.track("filter_applied", {
            filter_type: "cuisine",
            filter_value: id,
          });
          setCuisineIds((prev) => toggle(prev, id));
        }}
        onToggleTag={(id) => {
          analytics.track("filter_applied", {
            filter_type: "tag",
            filter_value: id,
          });
          setTagIds((prev) => toggle(prev, id));
        }}
        sort={sort}
        tagIds={tagIds}
        tags={tags.data ?? []}
      />
    </SafeAreaView>
  );
}
