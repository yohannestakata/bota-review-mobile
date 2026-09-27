import {
  Camera,
  Map as MapLibreMap,
  ViewAnnotation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { FilledStar } from "@/components/ui/filled-star";
import { Photo, PhotoFallback } from "@/components/ui/photo";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ThemedText } from "@/components/ui/themed-text";
import { openBadge } from "@/features/branch/hours";
import { GEBETA_API_KEY, useMapStyle } from "@/features/branch/map-style";
import { usePrefetchBranch } from "@/features/branch/prefetch";
import type { BranchCard } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { formatMenuPriceRange } from "@/lib/price";
import { useColors } from "@/lib/theme";

// Addis Ababa, for when no result has coordinates yet.
const ADDIS: [number, number] = [38.7578, 9.0301];

type Located = BranchCard & { lng: number; lat: number };

function located(branches: BranchCard[]): Located[] {
  return branches.flatMap((b) => {
    const lat = Number(b.latitude);
    const lng = Number(b.longitude);
    return b.latitude != null &&
      b.longitude != null &&
      Number.isFinite(lat) &&
      Number.isFinite(lng)
      ? [{ ...b, lat, lng }]
      : [];
  });
}

/**
 * Search results as pins on a map. Tapping a pin highlights it and shows a
 * compact card for that place at the bottom; tapping the card opens it.
 * The camera frames all pins whenever the results change.
 */
export function SearchMap({
  results,
  onOpen,
}: {
  results: BranchCard[];
  onOpen: (branch: BranchCard) => void;
}) {
  const colors = useColors();
  const mapStyle = useMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const pins = useMemo(() => located(results), [results]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pinPressedAt = useRef(0);
  const selected = pins.find((p) => p.id === selectedId) ?? null;

  // Frame every pin (leaving room for the card) once the map has loaded, and
  // again whenever the result set changes.
  const [mapReady, setMapReady] = useState(false);
  const boundsKey = pins.map((p) => p.id).join(",");
  useEffect(() => {
    if (!mapReady || pins.length === 0) return;
    if (pins.length === 1) {
      cameraRef.current?.easeTo({
        center: [pins[0].lng, pins[0].lat],
        zoom: 15,
        duration: 400,
      });
      return;
    }
    const lngs = pins.map((p) => p.lng);
    const lats = pins.map((p) => p.lat);
    cameraRef.current?.fitBounds(
      [
        Math.min(...lngs),
        Math.min(...lats),
        Math.max(...lngs),
        Math.max(...lats),
      ],
      {
        padding: { top: 60, right: 50, bottom: 200, left: 50 },
        duration: 400,
      },
    );
    // Only when the set of places changes, not on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boundsKey, mapReady]);

  if (!GEBETA_API_KEY) return null;

  return (
    <View className="flex-1">
      {mapStyle ? (
        <MapLibreMap
          attribution={false}
          compass={false}
          logo={false}
          mapStyle={mapStyle}
          onDidFinishLoadingMap={() => setMapReady(true)}
          onPress={() => {
            // A pin tap also reaches the map; don't let it undo the selection.
            if (Date.now() - pinPressedAt.current < 400) return;
            setSelectedId(null);
          }}
          style={{ flex: 1 }}
        >
          <Camera
            initialViewState={{ center: ADDIS, zoom: 12 }}
            ref={cameraRef}
          />
          {pins.map((pin) => {
            const isSelected = pin.id === selectedId;
            return (
              <ViewAnnotation
                anchor="center"
                id={pin.id}
                key={`${pin.id}-${isSelected ? "on" : "off"}`}
                lngLat={[pin.lng, pin.lat]}
                onPress={() => {
                  pinPressedAt.current = Date.now();
                  haptics.select();
                  setSelectedId(pin.id);
                }}
              >
                <View
                  className="flex-row items-center gap-1 rounded-full px-2.5 py-1"
                  style={{
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    borderWidth: 1,
                    borderColor: isSelected ? colors.primary : colors.border,
                  }}
                >
                  <FilledStar
                    color={isSelected ? colors.inverse : colors.rating}
                    size={11}
                  />
                  <ThemedText
                    size="xs"
                    tone={isSelected ? "inverse" : "default"}
                    weight="semibold"
                  >
                    {pin.reviewCount > 0
                      ? Number(pin.rating).toFixed(1)
                      : "New"}
                  </ThemedText>
                </View>
              </ViewAnnotation>
            );
          })}
        </MapLibreMap>
      ) : (
        <View className="flex-1 bg-placeholder" />
      )}

      {/* Required Gebeta attribution. */}
      <View
        className="absolute right-2 top-2 rounded bg-background/80 px-1.5 py-0.5"
        pointerEvents="none"
      >
        <ThemedText size="xs" tone="muted">
          © Gebeta Maps
        </ThemedText>
      </View>

      {pins.length === 0 ? (
        <View
          className="absolute left-0 right-0 top-12 items-center"
          pointerEvents="none"
        >
          <View className="rounded-full bg-surface px-4 py-2">
            <ThemedText size="sm" tone="muted">
              No places with a location to show
            </ThemedText>
          </View>
        </View>
      ) : null}

      {selected ? <SelectedCard branch={selected} onOpen={onOpen} /> : null}
    </View>
  );
}

function SelectedCard({
  branch,
  onOpen,
}: {
  branch: BranchCard;
  onOpen: (branch: BranchCard) => void;
}) {
  const prefetch = usePrefetchBranch();
  const badge = openBadge(branch);
  const price = formatMenuPriceRange(branch.menuPriceRange);
  const area = branch.neighborhood?.name ?? branch.label;

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      key={branch.id}
      // Sits above the tab bar, which already covers the safe area.
      style={{ position: "absolute", left: 16, right: 16, bottom: 16 }}
    >
      <PressableScale
        accessibilityLabel={`Open ${branch.placeName}`}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
        onPress={() => onOpen(branch)}
        onPressIn={() => prefetch(branch)}
        style={{
          boxShadow: [
            {
              offsetX: 0,
              offsetY: 4,
              blurRadius: 18,
              spreadDistance: 0,
              color: "rgba(0,0,0,0.18)",
            },
          ],
        }}
      >
        <View className="size-20 overflow-hidden rounded-xl bg-placeholder">
          {branch.coverPhotoUrl ? (
            <Photo
              style={{ width: "100%", height: "100%" }}
              uri={branch.coverPhotoUrl}
            />
          ) : (
            <PhotoFallback iconSize={24} />
          )}
        </View>
        <View className="flex-1 gap-0.5">
          <ThemedText numberOfLines={1} size="lg" weight="semibold">
            {branch.placeName}
          </ThemedText>
          {area ? (
            <ThemedText numberOfLines={1} size="sm" tone="muted">
              {area}
            </ThemedText>
          ) : null}
          <View className="flex-row items-center gap-1">
            {branch.reviewCount > 0 ? (
              <>
                <FilledStar size={13} />
                <ThemedText size="sm" weight="medium">
                  {Number(branch.rating).toFixed(1)}
                </ThemedText>
                <ThemedText size="sm" tone="muted">
                  ({branch.reviewCount})
                </ThemedText>
              </>
            ) : (
              <ThemedText size="sm" weight="medium">
                New
              </ThemedText>
            )}
            {price ? (
              <ThemedText numberOfLines={1} size="sm" tone="muted">
                {` · ${price}`}
              </ThemedText>
            ) : null}
          </View>
          {badge ? (
            <ThemedText size="xs" tone={badge.tone} weight="medium">
              {badge.label}
            </ThemedText>
          ) : null}
        </View>
      </PressableScale>
    </Animated.View>
  );
}
