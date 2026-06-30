import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetFooter,
  type BottomSheetFooterProps,
  BottomSheetModal,
  BottomSheetScrollView,
} from "@gorhom/bottom-sheet";
import {
  type ComponentRef,
  forwardRef,
  type ReactNode,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { Pressable, View } from "react-native";

import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  priceLabel,
  type Cuisine,
  type Neighborhood,
  type Tag,
} from "@/lib/api";
import { colors } from "@/lib/theme";

import { FilterChip } from "./filter-chip";
import type { SearchSort } from "../api";

const PRICE_LEVELS = [1, 2, 3, 4];
const SNAP_POINTS = ["90%"];
const SORT_OPTIONS: {
  value: Exclude<SearchSort, "distance">;
  label: string;
}[] = [
  { value: "rating", label: "Top rated" },
  { value: "review_count", label: "Most reviewed" },
  { value: "recently_verified", label: "Recently verified" },
  { value: "newest", label: "Newly added" },
];
const TAG_GROUPS: { category: Tag["category"]; label: string }[] = [
  { category: "vibe", label: "Vibe" },
  { category: "diet", label: "Dietary" },
  { category: "time", label: "Good for" },
  { category: "practical", label: "Features" },
];

export type FilterSheetRef = { present: () => void };

type FilterSheetProps = {
  neighborhoods: Neighborhood[];
  cuisines: Cuisine[];
  tags: Tag[];
  cuisineIds: string[];
  tagIds: string[];
  priceLevels: number[];
  neighborhoodId?: string;
  sort: Exclude<SearchSort, "distance">;
  onSelectNeighborhood: (id: string) => void;
  onSelectSort: (sort: Exclude<SearchSort, "distance">) => void;
  onToggleCuisine: (id: string) => void;
  onToggleTag: (id: string) => void;
  onTogglePrice: (level: number) => void;
  onClear: () => void;
};

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <ThemedText size="lg" weight="semibold">
        {title}
      </ThemedText>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export const FilterSheet = forwardRef<FilterSheetRef, FilterSheetProps>(
  function FilterSheet(
    {
      neighborhoods,
      cuisines,
      tags,
      cuisineIds,
      tagIds,
      priceLevels,
      neighborhoodId,
      sort,
      onSelectNeighborhood,
      onSelectSort,
      onToggleCuisine,
      onToggleTag,
      onTogglePrice,
      onClear,
    },
    ref,
  ) {
    const sheetRef = useRef<ComponentRef<typeof BottomSheetModal>>(null);

    // Present imperatively from the parent's button press (gorhom's recommended
    // pattern — far more reliable than presenting from a derived effect).
    useImperativeHandle(ref, () => ({
      present: () => sheetRef.current?.present(),
    }));

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
        />
      ),
      [],
    );

    const renderFooter = useCallback(
      (props: BottomSheetFooterProps) => (
        <BottomSheetFooter {...props}>
          <View className="border-t border-placeholder bg-background px-6 pb-6 pt-3">
            <Button
              label="Show results"
              onPress={() => sheetRef.current?.dismiss()}
            />
          </View>
        </BottomSheetFooter>
      ),
      [],
    );

    return (
      <BottomSheetModal
        backdropComponent={renderBackdrop}
        backgroundStyle={{
          backgroundColor: colors.background,
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
        }}
        enableDynamicSizing={false}
        enablePanDownToClose
        footerComponent={renderFooter}
        handleIndicatorStyle={{ backgroundColor: colors.border }}
        ref={sheetRef}
        snapPoints={SNAP_POINTS}
      >
        <View className="flex-row items-center justify-between px-6 pb-2 pt-1">
          <ThemedText size="lg" weight="semibold">
            Filters
          </ThemedText>
          <Pressable hitSlop={8} onPress={onClear}>
            <ThemedText tone="muted" weight="medium">
              Clear
            </ThemedText>
          </Pressable>
        </View>

        <BottomSheetScrollView
          contentContainerStyle={{
            paddingHorizontal: 24,
            paddingTop: 8,
            paddingBottom: 96,
          }}
        >
          <View className="gap-6">
            <Section title="Sort by">
              {SORT_OPTIONS.map((option) => (
                <FilterChip
                  key={option.value}
                  label={option.label}
                  onPress={() => onSelectSort(option.value)}
                  selected={sort === option.value}
                />
              ))}
            </Section>

            {neighborhoods.length > 0 ? (
              <Section title="Neighborhood">
                {neighborhoods.map((neighborhood) => (
                  <FilterChip
                    key={neighborhood.id}
                    label={neighborhood.name}
                    onPress={() => onSelectNeighborhood(neighborhood.id)}
                    selected={neighborhoodId === neighborhood.id}
                  />
                ))}
              </Section>
            ) : null}

            <Section title="Price">
              {PRICE_LEVELS.map((level) => (
                <FilterChip
                  key={level}
                  label={priceLabel(level)}
                  onPress={() => onTogglePrice(level)}
                  selected={priceLevels.includes(level)}
                />
              ))}
            </Section>

            {cuisines.length > 0 ? (
              <Section title="Cuisine">
                {cuisines.map((cuisine) => (
                  <FilterChip
                    key={cuisine.id}
                    label={cuisine.name}
                    onPress={() => onToggleCuisine(cuisine.id)}
                    selected={cuisineIds.includes(cuisine.id)}
                  />
                ))}
              </Section>
            ) : null}

            {TAG_GROUPS.map((group) => {
              const groupTags = tags.filter(
                (t) => t.category === group.category,
              );
              if (groupTags.length === 0) {
                return null;
              }
              return (
                <Section key={group.category} title={group.label}>
                  {groupTags.map((tag) => (
                    <FilterChip
                      key={tag.id}
                      label={tag.name}
                      onPress={() => onToggleTag(tag.id)}
                      selected={tagIds.includes(tag.id)}
                    />
                  ))}
                </Section>
              );
            })}
          </View>
        </BottomSheetScrollView>
      </BottomSheetModal>
    );
  },
);
