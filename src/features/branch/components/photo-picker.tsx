import {
  Add01Icon,
  ArrowDown01Icon,
  Camera01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";

import { askPhotoCategory } from "../ask-photo-category";
import {
  photoCategoryLabel,
  type PhotoCategory,
  type PickedPhoto,
} from "../api";
import { PressableFade, PressableScale } from "@/components/ui/pressable-scale";

const THUMB = 72;
const GAP = 8;

type PhotoPickerProps = {
  label: string;
  photos: PickedPhoto[];
  max: number;
  /** An upload is in flight. */
  adding?: boolean;
  onAdd: () => void;
  onRemove: (uri: string) => void;
  /** Section-heading label (review screen) instead of a field label. */
  heading?: boolean;
  /** Size thumbnails so `max` of them fill the row, instead of 72pt. */
  fill?: boolean;
  /** Shows each photo's category under it, tappable to change. */
  onCategoryChange?: (uri: string, category: PhotoCategory) => void;
};

// Add-photos control for forms. Empty, it's one row styled like a text field
// that says what it does and how many fit. With photos, it's a strip of
// thumbnails (each removable) plus an add tile while there's room, and the
// label shows the count.
export function PhotoPicker({
  label,
  photos,
  max,
  adding = false,
  onAdd,
  onRemove,
  heading = false,
  fill = false,
  onCategoryChange,
}: PhotoPickerProps) {
  const colors = useColors();
  const [rowWidth, setRowWidth] = useState(0);
  const thumb =
    fill && rowWidth > 0
      ? Math.floor((rowWidth - GAP * (max - 1)) / max)
      : THUMB;
  const canAdd = photos.length < max && !adding;

  return (
    <View className="gap-2">
      <View
        className="flex-row justify-between"
        style={{ alignItems: "center" }}
      >
        {heading ? (
          <ThemedText size="xl" weight="bold">
            {label}
          </ThemedText>
        ) : (
          <ThemedText size="sm" weight="medium">
            {label}
          </ThemedText>
        )}
        {photos.length > 0 ? (
          <ThemedText size="sm" tone="muted">
            {photos.length} of {max}
          </ThemedText>
        ) : null}
      </View>

      {photos.length === 0 ? (
        <PressableFade
          accessibilityLabel={`Add photos, up to ${max}`}
          accessibilityRole="button"
          className="h-14 flex-row items-center gap-3 rounded-xl border border-placeholder bg-surface px-4"
          disabled={adding}
          onPress={onAdd}
        >
          {adding ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <AppIcon color={colors.foreground} icon={Camera01Icon} size={20} />
          )}
          <ThemedText className="flex-1" size="sm">
            {adding ? "Adding…" : "Add photos"}
          </ThemedText>
          <ThemedText size="sm" tone="muted">
            Up to {max}
          </ThemedText>
        </PressableFade>
      ) : (
        <View
          className="flex-row flex-wrap"
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          style={{ gap: GAP }}
        >
          {photos.map((photo, index) => (
            <View className="gap-1" key={photo.uri} style={{ width: thumb }}>
              <View
                className="overflow-hidden rounded-xl bg-placeholder"
                style={{ width: thumb, height: thumb }}
              >
                <Image
                  accessibilityLabel={`Photo ${index + 1}`}
                  contentFit="cover"
                  source={photo.uri}
                  style={{ width: "100%", height: "100%" }}
                />
                <PressableFade
                  accessibilityLabel={`Remove photo ${index + 1}`}
                  accessibilityRole="button"
                  className="absolute items-center justify-center rounded-full bg-black/60"
                  hitSlop={10}
                  onPress={() => onRemove(photo.uri)}
                  style={{
                    top: 4,
                    right: 4,
                    width: 20,
                    height: 20,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.7)",
                  }}
                >
                  <AppIcon
                    color={colors.inverse}
                    icon={Cancel01Icon}
                    size={10}
                  />
                </PressableFade>
              </View>
              {onCategoryChange ? (
                <PressableFade
                  accessibilityHint="Changes what this photo is labelled as"
                  accessibilityLabel={`Photo ${index + 1}: ${photoCategoryLabel(photo.category ?? "food")}`}
                  accessibilityRole="button"
                  className="flex-row items-center justify-center gap-0.5"
                  hitSlop={6}
                  onPress={async () => {
                    const picked = await askPhotoCategory(
                      photo.category ?? "food",
                    );
                    if (picked) onCategoryChange(photo.uri, picked);
                  }}
                >
                  <ThemedText numberOfLines={1} size="xs" tone="muted">
                    {photoCategoryLabel(photo.category ?? "food")}
                  </ThemedText>
                  <AppIcon
                    color={colors.muted}
                    icon={ArrowDown01Icon}
                    size={12}
                  />
                </PressableFade>
              ) : null}
            </View>
          ))}

          {canAdd || adding ? (
            <PressableScale
              accessibilityLabel="Add another photo"
              accessibilityRole="button"
              className="items-center justify-center rounded-xl border border-placeholder bg-surface"
              disabled={adding}
              onPress={onAdd}
              style={{ width: thumb, height: thumb }}
            >
              {adding ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <AppIcon color={colors.foreground} icon={Add01Icon} size={22} />
              )}
            </PressableScale>
          ) : null}
        </View>
      )}
    </View>
  );
}
