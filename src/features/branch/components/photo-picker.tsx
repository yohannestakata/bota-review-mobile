import {
  Add01Icon,
  Camera01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useState } from "react";
import { ActivityIndicator, Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";

import type { PickedPhoto } from "../api";

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
        <Pressable
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
        </Pressable>
      ) : (
        <View
          className="flex-row flex-wrap"
          onLayout={(e) => setRowWidth(e.nativeEvent.layout.width)}
          style={{ gap: GAP }}
        >
          {photos.map((photo, index) => (
            <View
              className="overflow-hidden rounded-xl bg-placeholder"
              key={photo.uri}
              style={{ width: thumb, height: thumb }}
            >
              <Image
                accessibilityLabel={`Photo ${index + 1}`}
                contentFit="cover"
                source={photo.uri}
                style={{ width: "100%", height: "100%" }}
              />
              <Pressable
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
                <AppIcon color={colors.inverse} icon={Cancel01Icon} size={10} />
              </Pressable>
            </View>
          ))}

          {canAdd || adding ? (
            <Pressable
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
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}
