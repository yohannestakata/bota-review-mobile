import { Image } from "expo-image";
import { Pressable, ScrollView, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

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
        <Pressable
          className="w-[88px] items-center gap-2"
          key={item.slug}
          onPress={() => onPress(item.slug)}
        >
          <View className="size-[88px] overflow-hidden rounded-full bg-placeholder">
            {item.coverImageUrl ? (
              <Image
                contentFit="cover"
                source={item.coverImageUrl}
                style={{ width: "100%", height: "100%" }}
                transition={150}
              />
            ) : null}
          </View>
          <ThemedText
            className="text-center"
            numberOfLines={1}
            size="sm"
            weight="medium"
          >
            {item.title}
          </ThemedText>
        </Pressable>
      ))}
    </ScrollView>
  );
}
