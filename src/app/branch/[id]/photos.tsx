import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  Pressable,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CloseButton } from "@/components/ui/close-button";
import { ThemedText } from "@/components/ui/themed-text";
import { useBranch } from "@/features/branch";
import { ZoomableImage } from "@/features/branch/components/zoomable-image";
import { colors } from "@/lib/theme";

const { width } = Dimensions.get("window");

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function PhotoGalleryScreen() {
  const { id, index } = useLocalSearchParams<{ id: string; index?: string }>();
  const branch = useBranch(id);
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const photos = branch.data?.photos ?? [];
  const initialIndex = Math.min(
    Math.max(Number(index ?? 0) || 0, 0),
    Math.max(photos.length - 1, 0),
  );
  const [current, setCurrent] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);

  function onMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setCurrent(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  function goTo(target: number) {
    listRef.current?.scrollToIndex({ index: target, animated: true });
    setCurrent(target);
  }

  const category = photos[current]?.category;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000" }}>
      <FlatList
        data={photos}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        horizontal
        initialScrollIndex={initialIndex}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={onMomentumEnd}
        pagingEnabled
        renderItem={({ item }) => (
          <ZoomableImage
            isZoomed={zoomed}
            onZoomChange={setZoomed}
            uri={item.url}
          />
        )}
        scrollEnabled={!zoomed}
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
      />

      {/* Top bar: close + photo count */}
      <View
        className="absolute left-0 right-0 flex-row items-center justify-between px-4"
        style={{ top: insets.top + 8 }}
      >
        <CloseButton onPress={() => router.back()} overlay />
        {photos.length > 0 ? (
          <View className="rounded-full bg-white/20 px-3 py-1">
            <ThemedText size="sm" tone="inverse" weight="medium">
              {current + 1} / {photos.length}
            </ThemedText>
          </View>
        ) : null}
        <View className="size-10" />
      </View>

      {/* Bottom: category + thumbnail strip */}
      {photos.length > 0 ? (
        <View
          className="absolute left-0 right-0 gap-3"
          style={{ bottom: insets.bottom + 12 }}
        >
          {category ? (
            <ThemedText className="px-4" tone="inverse" weight="medium">
              {capitalize(category)}
            </ThemedText>
          ) : null}
          <FlatList
            contentContainerClassName="gap-2 px-4"
            data={photos}
            horizontal
            keyExtractor={(item) => item.id}
            renderItem={({ item, index: i }) => (
              <Pressable onPress={() => goTo(i)}>
                <Image
                  contentFit="cover"
                  source={item.url}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 10,
                    borderWidth: i === current ? 2 : 0,
                    borderColor: colors.inverse,
                    opacity: i === current ? 1 : 0.6,
                  }}
                  transition={150}
                />
              </Pressable>
            )}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      ) : null}
    </GestureHandlerRootView>
  );
}
