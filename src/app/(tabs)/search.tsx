import {
  Cancel01Icon,
  FilterHorizontalIcon,
  Search01Icon,
} from "@hugeicons/core-free-icons";
import { router } from "expo-router";
import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { BranchCard, useSavedBranchIds, useToggleSave } from "@/features/home";
import {
  FilterChip,
  FilterSheet,
  useCuisines,
  useSearch,
  useTags,
} from "@/features/search";
import type { BranchCard as BranchCardData } from "@/lib/api";
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
  const [text, setText] = useState("");
  const [cuisineIds, setCuisineIds] = useState<string[]>([]);
  const [tagIds, setTagIds] = useState<string[]>([]);
  const [priceLevels, setPriceLevels] = useState<number[]>([]);
  const [openNow, setOpenNow] = useState(false);
  const [nearby, setNearby] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedQ = useDebouncedValue(text.trim(), 300);
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
      cuisineId: cuisineIds.length > 0 ? cuisineIds : undefined,
      tagId: tagIds.length > 0 ? tagIds : undefined,
      priceLevel: priceLevels.length > 0 ? priceLevels : undefined,
      openNow: openNow || undefined,
      sort: sortByDistance ? ("distance" as const) : undefined,
      lat: coords?.lat,
      lng: coords?.lng,
    }),
    [
      debouncedQ,
      cuisineIds,
      tagIds,
      priceLevels,
      openNow,
      sortByDistance,
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
  const filterCount = cuisineIds.length + tagIds.length + priceLevels.length;
  const active =
    debouncedQ.length >= 2 || filterCount > 0 || openNow || sortByDistance;
  const results = search.data ?? [];

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      toggleSave.mutate({
        branchId: branch.id,
        isSaved: (savedIds ?? EMPTY_SAVED).has(branch.id),
      });
    },
    [savedIds, toggleSave],
  );

  function clearFilters() {
    setCuisineIds([]);
    setTagIds([]);
    setPriceLevels([]);
    setOpenNow(false);
    setNearby(false);
  }

  return (
    <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
      <View className="gap-3 px-6 pb-2 pt-2">
        <View className="h-14 flex-row items-center gap-2 rounded-full bg-surface px-5">
          <AppIcon color={colors.muted} icon={Search01Icon} size={22} />
          <TextInput
            autoFocus
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
              filterCount > 0 ? "border-foreground" : "border-border bg-surface"
            }`}
            onPress={() => setFiltersOpen(true)}
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
      </View>

      <FlatList
        contentContainerClassName="gap-5 px-6 pb-10 pt-2"
        data={results}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <View className="mt-24 items-center px-6">
            {nearbyPending ? (
              <ThemedText className="text-center" tone="muted">
                Finding places near you…
              </ThemedText>
            ) : !active ? (
              <ThemedText className="text-center" tone="muted">
                What are you in the mood for?
              </ThemedText>
            ) : search.isFetching ? (
              <ActivityIndicator color={colors.foreground} />
            ) : (
              <ThemedText className="text-center" tone="muted">
                Nothing matched — try different filters.
              </ThemedText>
            )}
          </View>
        }
        renderItem={({ item }) => (
          <BranchCard
            branch={item}
            isSaved={(savedIds ?? EMPTY_SAVED).has(item.id)}
            onPress={(branch) => router.push(`/branch/${branch.id}`)}
            onToggleSave={onToggleSave}
          />
        )}
      />

      <FilterSheet
        cuisineIds={cuisineIds}
        cuisines={cuisines.data ?? []}
        onClear={clearFilters}
        onClose={() => setFiltersOpen(false)}
        onToggleCuisine={(id) => setCuisineIds((prev) => toggle(prev, id))}
        onTogglePrice={(level) => setPriceLevels((prev) => toggle(prev, level))}
        onToggleTag={(id) => setTagIds((prev) => toggle(prev, id))}
        priceLevels={priceLevels}
        tagIds={tagIds}
        tags={tags.data ?? []}
        visible={filtersOpen}
      />
    </SafeAreaView>
  );
}
