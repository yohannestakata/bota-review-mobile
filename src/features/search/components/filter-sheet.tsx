import { Cancel01Icon } from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { priceLabel, type Cuisine, type Tag } from "@/lib/api";
import { colors } from "@/lib/theme";

import { FilterChip } from "./filter-chip";

const PRICE_LEVELS = [1, 2, 3, 4];
const TAG_GROUPS: { category: Tag["category"]; label: string }[] = [
  { category: "vibe", label: "Vibe" },
  { category: "diet", label: "Dietary" },
  { category: "time", label: "Good for" },
  { category: "practical", label: "Features" },
];

type FilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  cuisines: Cuisine[];
  tags: Tag[];
  cuisineIds: string[];
  tagIds: string[];
  priceLevels: number[];
  onToggleCuisine: (id: string) => void;
  onToggleTag: (id: string) => void;
  onTogglePrice: (level: number) => void;
  onClear: () => void;
};

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View className="gap-3">
      <ThemedText size="lg" weight="semibold">
        {title}
      </ThemedText>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

export function FilterSheet({
  visible,
  onClose,
  cuisines,
  tags,
  cuisineIds,
  tagIds,
  priceLevels,
  onToggleCuisine,
  onToggleTag,
  onTogglePrice,
  onClear,
}: FilterSheetProps) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      visible={visible}
    >
      <SafeAreaView className="flex-1 bg-background" edges={["top"]}>
        <View className="flex-row items-center justify-between px-4 py-3">
          <Pressable hitSlop={8} onPress={onClose}>
            <AppIcon color={colors.foreground} icon={Cancel01Icon} size={24} />
          </Pressable>
          <ThemedText size="lg" weight="semibold">
            Filters
          </ThemedText>
          <Pressable hitSlop={8} onPress={onClear}>
            <ThemedText tone="muted" weight="medium">
              Clear
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView
          className="flex-1"
          contentContainerClassName="gap-6 px-6 pb-6 pt-2"
        >
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
            const groupTags = tags.filter((t) => t.category === group.category);
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
        </ScrollView>

        <View className="px-6 pb-2 pt-2">
          <Button label="Show results" onPress={onClose} />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
