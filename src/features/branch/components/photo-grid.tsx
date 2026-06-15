import { Add01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
import { Image } from "expo-image";
import { useState } from "react";
import { type LayoutChangeEvent, Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";

import type { PickedPhoto } from "../api";

const COLUMNS = 3;
const GAP = 8;

type PhotoGridProps = {
  photos: PickedPhoto[];
  canAdd: boolean;
  onAdd: () => void;
  onRemove: (uri: string) => void;
};

// A 3-column grid of square cells. Cell size is derived from the measured row
// width so the columns always fill the available space with even gaps.
export function PhotoGrid({ photos, canAdd, onAdd, onRemove }: PhotoGridProps) {
  const [rowWidth, setRowWidth] = useState(0);
  const cell = rowWidth > 0 ? (rowWidth - GAP * (COLUMNS - 1)) / COLUMNS : 0;

  function onLayout(event: LayoutChangeEvent) {
    setRowWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      className="flex-row flex-wrap"
      onLayout={onLayout}
      style={{ gap: GAP }}
    >
      {cell > 0
        ? photos.map((photo) => (
            <View
              className="overflow-hidden rounded-xl bg-neutral-100"
              key={photo.uri}
              style={{ width: cell, height: cell }}
            >
              <Image
                contentFit="cover"
                source={photo.uri}
                style={{ width: "100%", height: "100%" }}
              />
              <Pressable
                className="absolute right-1 top-1 size-6 items-center justify-center rounded-full bg-black/60"
                hitSlop={4}
                onPress={() => onRemove(photo.uri)}
              >
                <AppIcon color={colors.inverse} icon={Cancel01Icon} size={12} />
              </Pressable>
            </View>
          ))
        : null}

      {cell > 0 && canAdd ? (
        <Pressable
          className="items-center justify-center rounded-xl border border-dashed border-neutral-300"
          onPress={onAdd}
          style={{ width: cell, height: cell }}
        >
          <AppIcon color={colors.muted} icon={Add01Icon} size={26} />
        </Pressable>
      ) : null}
    </View>
  );
}
