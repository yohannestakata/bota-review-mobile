import { Image } from "expo-image";
import { ScrollView, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { PressableScale } from "@/components/ui/pressable-scale";

export type CollectionCircleItem = {
  slug: string;
  title: string;
  coverImageUrl?: string | null;
};

type CollectionCirclesProps = {
  items: CollectionCircleItem[];
  onPress: (slug: string) => void;
};

export function CollectionCircles({ items, onPress }: CollectionCirclesProps) {
  return (
    <ScrollView
      contentContainerClassName="gap-4 px-6"
      horizontal
      showsHorizontalScrollIndicator={false}
    >
      {items.map((item) => (
        <PressableScale
          className="w-20 items-center gap-2"
          key={item.slug}
          onPress={() => onPress(item.slug)}
        >
          <View className="size-20 rounded-full bg-accent-soft p-1">
            <View className="flex-1 overflow-hidden rounded-full bg-placeholder">
              {item.coverImageUrl ? (
                <Image
                  contentFit="cover"
                  source={item.coverImageUrl}
                  style={{ width: "100%", height: "100%" }}
                  transition={150}
                />
              ) : null}
            </View>
          </View>
          <ThemedText
            className="text-center"
            numberOfLines={1}
            size="sm"
            tone="brand"
            weight="medium"
          >
            {item.title}
          </ThemedText>
        </PressableScale>
      ))}
    </ScrollView>
  );
}
