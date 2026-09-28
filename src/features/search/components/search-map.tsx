import {
  Camera,
  Map as MapLibreMap,
  ViewAnnotation,
  type CameraRef,
} from "@maplibre/maplibre-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { Location04Icon } from "@hugeicons/core-free-icons";

import { FilledStar } from "@/components/ui/filled-star";
import { AppIcon } from "@/components/ui/huge-icon";
import { Photo, PhotoFallback } from "@/components/ui/photo";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ThemedText } from "@/components/ui/themed-text";
import { openBadge } from "@/features/branch/hours";
import { GEBETA_API_KEY, useMapStyle } from "@/features/branch/map-style";
import { usePrefetchBranch } from "@/features/branch/prefetch";
import { usePhotoFlight } from "@/features/branch/shared-photo";
import { useSavedBranchIds } from "@/features/home";
import { AREA_PAGE_SIZE } from "../queries";
import type { BranchCard } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { formatMenuPriceRange } from "@/lib/price";
import { useColors } from "@/lib/theme";
import { useLocation } from "@/lib/use-location";

// Addis Ababa, for when no result has coordinates yet.
const ADDIS: [number, number] = [38.7578, 9.0301];

type Located = BranchCard & { lng: number; lat: number };
type Cluster = { id: string; lng: number; lat: number; members: Located[] };

const PIN_SHADOW = [
  {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 4,
    spreadDistance: 0,
    color: "rgba(0,0,0,0.25)",
  },
];

// Pins closer than this on screen merge into one numbered bubble.
const CLUSTER_RADIUS_PX = 44;

// Web Mercator: lng/lat → pixel position at a zoom level.
function project(lng: number, lat: number, zoom: number) {
  const scale = 256 * 2 ** zoom;
  const sin = Math.sin((lat * Math.PI) / 180);
  return {
    x: ((lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale,
  };
}

// Greedy screen-space clustering: each pin joins the first cluster whose
// centre is within the radius at the current zoom, else starts its own.
function cluster(pins: Located[], zoom: number): Cluster[] {
  const out: (Cluster & { x: number; y: number })[] = [];
  for (const pin of pins) {
    const { x, y } = project(pin.lng, pin.lat, zoom);
    const near = out.find(
      (c) => Math.hypot(c.x - x, c.y - y) < CLUSTER_RADIUS_PX,
    );
    if (near) {
      near.members.push(pin);
    } else {
      out.push({
        id: pin.id,
        lng: pin.lng,
        lat: pin.lat,
        x,
        y,
        members: [pin],
      });
    }
  }
  return out;
}

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
 * The camera frames all pins when the map opens. After that, moving the map
 * (by hand, "center on me", or tapping a cluster) reloads the places inside
 * the visible area once the map settles; the map itself stays put.
 */
export function SearchMap({
  results,
  onOpen,
  onSearchArea,
  areaActive = false,
  loading = false,
}: {
  results: BranchCard[];
  onOpen: (branch: BranchCard) => void;
  onSearchArea?: (bbox: [number, number, number, number]) => void;
  areaActive?: boolean;
  /** Results are refreshing (shows a small indicator; pins stay put). */
  loading?: boolean;
}) {
  // A busy area hit the per-request cap: say so, so it isn't mistaken for
  // "that's everything here".
  const capped = areaActive && !loading && results.length >= AREA_PAGE_SIZE;
  const colors = useColors();
  const mapStyle = useMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const pins = useMemo(() => located(results), [results]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const pinPressedAt = useRef(0);
  const selected = pins.find((p) => p.id === selectedId) ?? null;
  const [zoom, setZoom] = useState(12);
  const clusters = useMemo(() => cluster(pins, zoom), [pins, zoom]);
  const location = useLocation();
  const wantsLocate = useRef(false);
  const [locating, setLocating] = useState(false);
  // Moves the app starts on purpose (center on me, cluster tap) should load
  // their area too; the initial fit-to-results must not.
  const loadNextMove = useRef(false);
  const areaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (areaTimer.current) clearTimeout(areaTimer.current);
    },
    [],
  );

  function flyToMe() {
    loadNextMove.current = true;
    if (location.coords) {
      cameraRef.current?.easeTo({
        center: [location.coords.lng, location.coords.lat],
        zoom: Math.max(zoom, 14),
        duration: 500,
      });
      return;
    }
    // No fix yet: ask (or open Settings), then fly once it arrives.
    wantsLocate.current = true;
    setLocating(true);
    void location.request().then((ok) => {
      if (!ok) {
        wantsLocate.current = false;
        setLocating(false);
      }
    });
  }
  useEffect(() => {
    if (wantsLocate.current && location.coords) {
      wantsLocate.current = false;
      setLocating(false);
      cameraRef.current?.easeTo({
        center: [location.coords.lng, location.coords.lat],
        zoom: 14,
        duration: 500,
      });
    }
  }, [location.coords]);

  // Frame every pin (leaving room for the card) once the map has loaded, and
  // again whenever the result set changes.
  const [mapReady, setMapReady] = useState(false);
  const boundsKey = pins.map((p) => p.id).join(",");
  useEffect(() => {
    if (!mapReady || pins.length === 0 || areaActive) return;
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
          // Re-cluster at whole-zoom steps once the camera settles.
          onRegionDidChange={(e) => {
            const z = Math.round(e.nativeEvent.zoom * 2) / 2;
            if (z !== zoom) setZoom(z);
            // Load what's in view shortly after a deliberate move settles
            // (a quick follow-up pan restarts the wait).
            const deliberate =
              e.nativeEvent.userInteraction || loadNextMove.current;
            if (!deliberate || !onSearchArea) return;
            loadNextMove.current = false;
            const bounds = e.nativeEvent.bounds;
            if (areaTimer.current) clearTimeout(areaTimer.current);
            areaTimer.current = setTimeout(() => onSearchArea(bounds), 500);
          }}
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
          {location.coords ? (
            <ViewAnnotation
              anchor="center"
              id="me"
              lngLat={[location.coords.lng, location.coords.lat]}
            >
              <View
                style={{
                  width: 16,
                  height: 16,
                  borderRadius: 8,
                  borderWidth: 3,
                  borderColor: "#fff",
                  backgroundColor: "#2563eb",
                }}
              />
            </ViewAnnotation>
          ) : null}
          {clusters.map((group) => {
            if (group.members.length > 1) {
              return (
                <ViewAnnotation
                  anchor="center"
                  id={`cluster-${group.id}`}
                  key={`cluster-${group.id}-${group.members.length}`}
                  lngLat={[group.lng, group.lat]}
                  onPress={() => {
                    pinPressedAt.current = Date.now();
                    haptics.select();
                    loadNextMove.current = true;
                    // Zoom in until this group starts to split apart.
                    cameraRef.current?.easeTo({
                      center: [group.lng, group.lat],
                      zoom: zoom + 2,
                      duration: 400,
                    });
                  }}
                >
                  <View
                    className="items-center justify-center rounded-full"
                    style={{
                      boxShadow: PIN_SHADOW,
                      minWidth: 34,
                      height: 34,
                      paddingHorizontal: 8,
                      backgroundColor: colors.primary,
                      borderWidth: 2,
                      borderColor: colors.surface,
                    }}
                  >
                    <ThemedText size="sm" tone="inverse" weight="bold">
                      {group.members.length}
                    </ThemedText>
                  </View>
                </ViewAnnotation>
              );
            }
            const pin = group.members[0];
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
                  className="flex-row items-center gap-1 rounded-full"
                  style={{
                    paddingHorizontal: 9,
                    paddingVertical: 4,
                    backgroundColor: isSelected
                      ? colors.primary
                      : colors.surface,
                    // A clear outline + soft shadow so white pins stand out on
                    // the light map (the old hairline border disappeared).
                    borderWidth: 1.5,
                    borderColor: isSelected ? colors.surface : colors.muted,
                    boxShadow: PIN_SHADOW,
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

      {/* One status pill: loading takes priority, then "nothing here". */}
      {loading || pins.length === 0 || capped ? (
        <Animated.View
          entering={FadeIn.duration(160)}
          exiting={FadeOut.duration(120)}
          pointerEvents="none"
          style={{
            position: "absolute",
            top: 12,
            left: 0,
            right: 0,
            alignItems: "center",
          }}
        >
          <View
            className="flex-row items-center gap-2 rounded-full"
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: colors.surface,
              boxShadow: PIN_SHADOW,
            }}
          >
            {loading ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : null}
            <ThemedText size="sm" tone="muted" weight="medium">
              {loading
                ? "Finding places"
                : capped
                  ? "Top 50 here. Zoom in for more."
                  : areaActive
                    ? "No places in this area yet"
                    : "No places with a location to show"}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

      {/* Center on me — above the preview card when one is showing. */}
      <PressableScale
        accessibilityLabel="Show my location"
        accessibilityRole="button"
        className="items-center justify-center rounded-full"
        onPress={flyToMe}
        style={[
          {
            position: "absolute",
            right: 16,
            bottom: selected ? 140 : 16,
            width: 44,
            height: 44,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
          },
        ]}
      >
        {locating ? (
          <ActivityIndicator color={colors.muted} size="small" />
        ) : (
          <AppIcon color={colors.foreground} icon={Location04Icon} size={20} />
        )}
      </PressableScale>

      {selected ? (
        <ResultCarousel
          onOpen={onOpen}
          onSelect={(pin) => {
            setSelectedId(pin.id);
            // Follow the swipe without zooming or triggering an area reload.
            cameraRef.current?.easeTo({
              center: [pin.lng, pin.lat],
              duration: 350,
            });
          }}
          pins={pins}
          selectedId={selected.id}
        />
      ) : null}
    </View>
  );
}

const CARD_GAP = 8;
const CARD_SIDE = 24;

/**
 * The selected place, with its neighbours a swipe away: a snapping row of
 * cards over the map. Swiping selects the next place (and the map follows);
 * tapping a pin scrolls the row to it. Tapping a card opens the place.
 */
function ResultCarousel({
  pins,
  selectedId,
  onSelect,
  onOpen,
}: {
  pins: Located[];
  selectedId: string;
  onSelect: (pin: Located) => void;
  onOpen: (branch: BranchCard) => void;
}) {
  const { width } = useWindowDimensions();
  const cardWidth = width - CARD_SIDE * 2;
  const snap = cardWidth + CARD_GAP;
  const listRef = useRef<FlatList<Located>>(null);
  const index = Math.max(
    0,
    pins.findIndex((p) => p.id === selectedId),
  );
  // Set while a swipe is choosing the selection, so we don't scroll back.
  const fromSwipe = useRef(false);
  // Scroll events outpace re-renders; remember what we last picked so one
  // crossing selects (and buzzes) once.
  const lastPicked = useRef(selectedId);

  useEffect(() => {
    lastPicked.current = selectedId;
    if (fromSwipe.current) {
      fromSwipe.current = false;
      return;
    }
    listRef.current?.scrollToOffset({ offset: index * snap, animated: true });
  }, [index, snap, selectedId]);

  return (
    <Animated.View
      entering={FadeIn.duration(160)}
      exiting={FadeOut.duration(120)}
      // Sits above the tab bar, which already covers the safe area.
      style={{ position: "absolute", left: 0, right: 0, bottom: 16 }}
    >
      <FlatList
        contentContainerStyle={{
          paddingHorizontal: CARD_SIDE,
          gap: CARD_GAP,
        }}
        data={pins}
        decelerationRate="fast"
        getItemLayout={(_, i) => ({ length: snap, offset: snap * i, index: i })}
        horizontal
        initialScrollIndex={index}
        keyExtractor={(item) => item.id}
        // Select a card as soon as it's more than halfway in — while the
        // finger is still dragging or the snap is still settling — so the map
        // starts moving with the swipe instead of after it.
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / snap);
          const pin = pins[Math.min(Math.max(i, 0), pins.length - 1)];
          if (pin && pin.id !== lastPicked.current) {
            lastPicked.current = pin.id;
            fromSwipe.current = true;
            haptics.select();
            onSelect(pin);
          }
        }}
        scrollEventThrottle={16}
        ref={listRef}
        renderItem={({ item }) => (
          <PlaceCard branch={item} onOpen={onOpen} width={cardWidth} />
        )}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
      />
    </Animated.View>
  );
}

function PlaceCard({
  branch,
  onOpen,
  width,
}: {
  branch: BranchCard;
  onOpen: (branch: BranchCard) => void;
  width: number;
}) {
  const prefetch = usePrefetchBranch();
  const saved = useSavedBranchIds();
  const { ref: photoRef, open: flyOpen } = usePhotoFlight();
  const badge = openBadge(branch);
  const price = formatMenuPriceRange(branch.menuPriceRange);
  const area = branch.neighborhood?.name ?? branch.label;

  return (
    <View style={{ width }}>
      <PressableScale
        accessibilityLabel={`Open ${branch.placeName}`}
        accessibilityRole="button"
        className="flex-row items-center gap-3 rounded-2xl bg-surface p-3"
        onPress={() =>
          flyOpen(
            {
              branchId: branch.id,
              uri: branch.coverPhotoUrl,
              radius: 10.5, // rounded-xl
              saved: saved.data?.has(branch.id),
            },
            () => onOpen(branch),
          )
        }
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
        <View
          className="overflow-hidden rounded-xl bg-placeholder"
          ref={photoRef}
          style={{ width: 84, height: 84 }}
        >
          {branch.coverPhotoUrl ? (
            <Photo
              style={{ width: "100%", height: "100%" }}
              uri={branch.coverPhotoUrl}
            />
          ) : (
            <PhotoFallback iconSize={24} />
          )}
        </View>
        {/* Three lines with room between them: name; rating and price;
            open status and area. */}
        <View className="flex-1 justify-center gap-1.5">
          <ThemedText numberOfLines={1} size="lg" weight="semibold">
            {branch.placeName}
          </ThemedText>
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
          {badge || area ? (
            <ThemedText numberOfLines={1} size="sm" tone="muted">
              {badge ? (
                <ThemedText size="sm" tone={badge.tone} weight="medium">
                  {badge.label}
                </ThemedText>
              ) : null}
              {badge && area ? " · " : ""}
              {area ?? ""}
            </ThemedText>
          ) : null}
        </View>
      </PressableScale>
    </View>
  );
}
