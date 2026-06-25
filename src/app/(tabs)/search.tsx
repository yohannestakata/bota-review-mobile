import {
  Cancel01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { FlashList, ListGapLg } from "@/components/ui/flash-list";
import { BranchCard, useSavedBranchIds, useToggleSave } from "@/features/home";
import {
  FilterChip,
  FilterSheet,
  type FilterSheetRef,
  SearchResultsSkeleton,
  useCuisines,
  useNeighborhoods,
  useSearch,
  useTags,
  type SearchSort,
} from "@/features/search";
import { analytics } from "@/lib/analytics";
import { priceLabel, type BranchCard as BranchCardData } from "@/lib/api";
import { colors } from "@/lib/theme";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { useLocation } from "@/lib/use-location";

const EMPTY_SAVED = new Set<string>();

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((x) => x !== value)
    : [...list, value];
}

export default function SearchScreen() {
  const { isSignedIn } = useAuth();
  const [text, setText] = useState("");
  const [neighborhoodId, setNeighborhoodId] = useState<string>();
  const [cuisineIds, setCuisineIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [sort, setSort] = useState<Exclude<SearchSort, "distance">>("rating");
  const [openNow, setOpenNow] = useState(false);
  const [nearby, setNearby] = useState(false);
  const filterSheetRef = useRef<FilterSheetRef>(null);

  const debouncedQ = useDebouncedValue(text.trim(), 300);
  const neighborhoods = useNeighborhoods();
  const cuisines = useCuisines();
  const tags = useTags();
  const { coords, status, request } = useLocation();
  const { data: savedIds } = useSavedBranchIds();
  const toggleSave = useToggleSave();

  // "Nearby" only sorts by distance once we actually have coordinates.
  const sortByDistance = nearby && coords != null;
  // Waiting on a granted-but-not-yet-resolved location fix.
  const nearbyPending = nearby && coords == null && status !== "denied";

  const params = useMemo(
    () => ({
      q: debouncedQ,
      neighborhoodId,
      cuisineId: cuisineIds.length > 0 ? cuisineIds : undefined,
      tagId: tagIds.length > 0 ? tagIds : undefined,
      priceLevel: priceLevels.length > 0 ? priceLevels : undefined,
      openNow: openNow || undefined,
      sort: sortByDistance ? ("distance" as const) : sort,
      lat: coords?.lat,
      lng: coords?.lng,
    }),
    [
      debouncedQ,
      neighborhoodId,
      cuisineIds,
      tagIds,
      priceLevels,
      openNow,
      sortByDistance,
      sort,
      coords?.lat,
      coords?.lng,
    ],
  );

  async function toggleNearby() {
    if (nearby) {
      setNearby(false);
      return;
    }

    if (coords == null && !(await request())) {
      Alert.alert(
        "Location is off",
        "Turn on location access to find places near you.",
      );
      return;
    }

    setNearby(true);
  }

  const search = useSearch(params);
  const filterCount =
    (neighborhoodId ? 1 : 0) +
    cuisineIds.length +
    tagIds.length +
    priceLevels.length +
    (sort === "rating" ? 0 : 1);
  const active =
    debouncedQ.length >= 2 || filterCount > 0 || openNow || sortByDistance;
  const resultPages = search.data?.pages;
  const results = useMemo(() => {
    const unique = new Map<string, BranchCardData>();
    resultPages?.flat().forEach((branch) => unique.set(branch.id, branch));
    return [...unique.values()];
  }, [resultPages]);
  const firstPageCount = search.data?.pages[0]?.length ?? 0;

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
          priceLevels,
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
    priceLevels,
    openNow,
    sort,
  ]);

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

  function clearFilters() {
    setNeighborhoodId(undefined);
    setCuisineIds([]);
    setTagIds([]);
    setPriceLevels([]);
    setSort("rating");
    setOpenNow(false);
    setNearby(false);
  }

  // Removable chips for each applied sheet filter (neighborhood/cuisine/tag/
  // price). Tapping a chip clears just that filter; Open now / Nearby keep their
  // own toggle chips in the row above.
  const activeChips: { key: string; label: string; onRemove: () => void }[] = [];
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
  priceLevels.forEach((level) => {
    activeChips.push({
      key: `price-${level}`,
      label: priceLabel(level),
      onRemove: () => setPriceLevels((prev) => prev.filter((x) => x !== level)),
    });
  });

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="gap-3 px-6 pb-2 pt-2">
        <View className="h-14 flex-row items-center gap-2 rounded-full border border-placeholder bg-surface px-5">
          <AppIcon color={colors.muted} icon={Search01Icon} size={22} />
          <TextInput
            className="flex-1 font-outfit text-md text-foreground"
            onChangeText={setText}
            placeholder="Pizza? Coffee? Injera?"
            placeholderTextColor={colors.muted}
            returnKeyType="search"
            value={text}
          />
          {text.length > 0 ? (
            <Pressable hitSlop={8} onPress={() => setText("")}>
              <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
            </Pressable>
          ) : null}
        </View>

        <View className="flex-row gap-2">
          <Pressable
            className={`flex-row items-center gap-2 rounded-full border px-4 py-2 ${
              filterCount > 0 ? "border-foreground" : "border-placeholder bg-surface"
            }`}
            onPress={() => filterSheetRef.current?.present()}
          >
            <AppIcon
              color={colors.foreground}
              icon={FilterHorizontalIcon}
              size={16}
            />
            <ThemedText size="sm" weight="medium">
              {filterCount > 0 ? `Filters · ${filterCount}` : "Filters"}
            </ThemedText>
          </Pressable>

          <FilterChip label="Nearby" onPress={toggleNearby} selected={nearby} />

          <FilterChip
            label="Open now"
            onPress={() => setOpenNow((v) => !v)}
            selected={openNow}
          />
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
                className="flex-row items-center gap-1.5 rounded-full bg-surface-muted px-3 py-1.5"
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

      <FlashList
        contentContainerClassName="px-6 pb-10 pt-2"
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
            <SearchResultsSkeleton />
          ) : search.isError ? (
            <View className="mt-24 items-center gap-3 px-6">
              <ThemedText className="text-center" tone="muted">
                Couldn&apos;t load places right now.
              </ThemedText>
              <Pressable onPress={() => search.refetch()}>
                <ThemedText tone="brand" weight="semibold">
                  Try again
                </ThemedText>
              </Pressable>
            </View>
          ) : !active ? (
            <View className="mt-24 items-center px-6">
              <ThemedText className="text-center" tone="muted">
                No places are available yet.
              </ThemedText>
            </View>
          ) : (
            <View className="mt-24 items-center px-6">
              <ThemedText className="text-center" tone="muted">
                Nothing matched — try different filters.
              </ThemedText>
            </View>
          )
        }
        ListHeaderComponent={
          results.length > 0 ? (
            <ThemedText className="mb-5" size="xl" weight="semibold">
              {active ? "Results" : "Explore places"}
            </ThemedText>
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
              <Pressable onPress={() => search.fetchNextPage()}>
                <ThemedText tone="brand" weight="semibold">
                  Try again
                </ThemedText>
              </Pressable>
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
        onRefresh={() => search.refetch()}
        refreshing={search.isRefetching && !search.isFetchingNextPage}
        renderItem={({ item }) => (
          <BranchCard
            branch={item}
            isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
            onPress={(branch) =>
              router.push(`/branch/${branch.id}?source=search`)
            }
            onToggleSave={onToggleSave}
          />
        )}
      />

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
        onTogglePrice={(level) => {
          analytics.track("filter_applied", {
            filter_type: "price",
            filter_value: level,
          });
          setPriceLevels((prev) => toggle(prev, level));
        }}
        onToggleTag={(id) => {
          analytics.track("filter_applied", {
            filter_type: "tag",
            filter_value: id,
          });
          setTagIds((prev) => toggle(prev, id));
        }}
        priceLevels={priceLevels}
        sort={sort}
        tagIds={tagIds}
        tags={tags.data ?? []}
      />
    </SafeAreaView>
  );
}
