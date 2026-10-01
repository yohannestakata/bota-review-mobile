import {
  Camera,
  GeoJSONSource,
  Layer,
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
import type { BranchCard } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { formatMenuPriceRange } from "@/lib/price";
import { useColors } from "@/lib/theme";
import { useLocation } from "@/lib/use-location";

import type { MapFilters, MapPin } from "../api";
import { useMapCards, useMapPoints, type MapViewport } from "../queries";

// Addis Ababa, where the map opens.
const ADDIS: [number, number] = [38.7578, 9.0301];
const START_ZOOM = 12;
// Greater Addis, for finding every match of a search before framing them.
const CITY: MapViewport = { bbox: [38.6, 8.8, 39.05, 9.15], zoom: 12 };

type Located = BranchCard & { lng: number; lat: number };
type Selected = Pick<MapPin, "id" | "lat" | "lng" | "name">;

const PIN_SHADOW = [
  {
    offsetX: 0,
    offsetY: 1,
    blurRadius: 4,
    spreadDistance: 0,
    color: "rgba(0,0,0,0.25)",
  },
];

// Rating pills are real views; past this many the rest draw as dots, so a
// busy map stays smooth.
const MAX_RATING_PILLS = 60;
// The carousel shows the picked place and its nearest neighbours.
const CAROUSEL_SIZE = 10;

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

// The viewport before the map reports its own: Web Mercator at a zoom spans
// this many degrees across `width` points.
function initialViewport(width: number, height: number): MapViewport {
  const degPerPt = 360 / (256 * 2 ** START_ZOOM);
  const halfW = (width / 2) * degPerPt;
  // Close enough at Addis's latitude (9°N), where Mercator barely stretches.
  const halfH = (height / 2) * degPerPt;
  return {
    bbox: [
      ADDIS[0] - halfW,
      ADDIS[1] - halfH,
      ADDIS[0] + halfW,
      ADDIS[1] + halfH,
    ],
    zoom: START_ZOOM,
  };
}

// Tap timestamps, read only from press handlers.
const now = () => Date.now();

function countLabel(n: number) {
  return n >= 1000 ? `${(n / 1000).toFixed(n >= 10_000 ? 0 : 1)}k` : String(n);
}

function nearest(from: Selected, pins: MapPin[], count: number) {
  return [...pins]
    .filter((p) => p.id !== from.id)
    .sort(
      (a, b) =>
        Math.hypot(a.lat - from.lat, a.lng - from.lng) -
        Math.hypot(b.lat - from.lat, b.lng - from.lng),
    )
    .slice(0, count);
}

/**
 * Every place matching the search, on a map. The server returns what's in
 * view: all of it as pins when there are a few hundred or fewer, otherwise
 * dense areas as clusters with their true counts. Unrated places are small
 * dots drawn by the map itself; rated ones get a rating pill. Tapping a place
 * shows a swipeable row of it and its nearest neighbours; tapping a cluster
 * zooms in.
 */
export function SearchMap({
  filters,
  onOpen,
}: {
  filters: MapFilters;
  onOpen: (branch: BranchCard) => void;
}) {
  const colors = useColors();
  const mapStyle = useMapStyle();
  const cameraRef = useRef<CameraRef>(null);
  const { width, height } = useWindowDimensions();
  const [viewport, setViewport] = useState<MapViewport>(() =>
    initialViewport(width, height * 0.7),
  );
  const points = useMapPoints(filters, viewport);
  // A search looks across the whole city, not just the view: these are all
  // its matches, used to frame them and to say when there are none at all.
  const filtered = Boolean(
    filters.q.trim().length >= 2 ||
    filters.neighborhoodId ||
    filters.cuisineId?.length ||
    filters.tagId?.length ||
    filters.openNow,
  );
  const cityPoints = useMapPoints(filters, filtered ? CITY : null);
  const pins = useMemo(() => points.data?.pins ?? [], [points.data]);

  const clusters = useMemo(() => points.data?.clusters ?? [], [points.data]);

  // The picked place and its carousel, tied to the search they were made
  // in: a new search makes an old pick simply not count.
  const filtersKey = JSON.stringify(filters);
  const [pick, setPick] = useState<{
    key: string;
    selected: Selected;
    ids: string[];
  } | null>(null);
  const active = pick?.key === filtersKey ? pick : null;
  const selected = active?.selected ?? null;
  const carouselIds = useMemo(() => active?.ids ?? [], [active?.ids]);
  const cards = useMapCards(carouselIds);
  const carouselPins = useMemo(() => located(cards.data ?? []), [cards.data]);
  const pinPressedAt = useRef(0);

  const location = useLocation();
  const wantsLocate = useRef(false);
  const [locating, setLocating] = useState(false);

  // A new search moves the map to frame all its matches, wherever they are
  // (browsing everything keeps the current view).
  const fittedFor = useRef<string | null>(null);
  useEffect(() => {
    const data = cityPoints.data;
    if (!filtered || !data || cityPoints.isPlaceholderData) return;
    if (fittedFor.current === filtersKey) return;
    fittedFor.current = filtersKey;
    const all = [
      ...data.pins,
      ...data.clusters.map((c) => ({ lat: c.lat, lng: c.lng })),
    ];
    if (all.length === 0) return;
    if (all.length === 1) {
      cameraRef.current?.easeTo({
        center: [all[0].lng, all[0].lat],
        zoom: 15,
        duration: 400,
      });
      return;
    }
    const lngs = all.map((p) => p.lng);
    const lats = all.map((p) => p.lat);
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
  }, [cityPoints.data, cityPoints.isPlaceholderData, filtered, filtersKey]);

  function select(pin: MapPin) {
    pinPressedAt.current = now();
    haptics.select();
    // Keep the row if the pin is already in it; otherwise build it around
    // this place.
    setPick({
      key: filtersKey,
      selected: pin,
      ids: carouselIds.includes(pin.id)
        ? carouselIds
        : [pin.id, ...nearest(pin, pins, CAROUSEL_SIZE - 1).map((p) => p.id)],
    });
  }

  function zoomInto(lng: number, lat: number) {
    pinPressedAt.current = now();
    haptics.select();
    cameraRef.current?.easeTo({
      center: [lng, lat],
      zoom: viewport.zoom + 2,
      duration: 400,
    });
  }

  function flyToMe() {
    if (location.coords) {
      cameraRef.current?.easeTo({
        center: [location.coords.lng, location.coords.lat],
        zoom: Math.max(viewport.zoom, 14),
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

  // Rated places get pills (the best ones, if there are many) and clusters
  // are numbered bubbles; the many remaining places are dots drawn by the map
  // renderer itself. (Cluster numbers aren't a map text layer: loading map
  // fonts for one crashes MapLibre on iOS.)
  const ratingPills = useMemo(
    () =>
      pins
        .filter((p) => p.reviewCount > 0 && p.id !== selected?.id)
        .slice(0, MAX_RATING_PILLS),
    [pins, selected?.id],
  );
  const shapes = useMemo((): GeoJSON.FeatureCollection => {
    const pillIds = new Set(ratingPills.map((p) => p.id));
    return {
      type: "FeatureCollection",
      features: [
        ...pins
          .filter((p) => !pillIds.has(p.id) && p.id !== selected?.id)
          .map(
            (p): GeoJSON.Feature => ({
              type: "Feature",
              id: p.id,
              geometry: { type: "Point", coordinates: [p.lng, p.lat] },
              properties: { kind: "place", id: p.id },
            }),
          ),
      ],
    };
  }, [pins, ratingPills, selected?.id]);
  const pinsById = useMemo(() => new Map(pins.map((p) => [p.id, p])), [pins]);

  const noMatches =
    filtered && !cityPoints.isPlaceholderData && cityPoints.data?.total === 0;
  const empty = noMatches || points.data?.total === 0;
  const firstLoad = !points.data && points.isFetching;

  if (!GEBETA_API_KEY) return null;

  return (
    <View className="flex-1">
      {mapStyle ? (
        <MapLibreMap
          attribution={false}
          compass={false}
          logo={false}
          mapStyle={mapStyle}
          onRegionDidChange={(e) => {
            const { bounds, zoom } = e.nativeEvent;
            setViewport({ bbox: bounds, zoom });
          }}
          onPress={() => {
            // A pin tap also reaches the map; don't let it undo the selection.
            if (now() - pinPressedAt.current < 400) return;
            setPick(null);
          }}
          style={{ flex: 1 }}
        >
          <Camera
            initialViewState={{ center: ADDIS, zoom: START_ZOOM }}
            ref={cameraRef}
          />

          <GeoJSONSource
            data={shapes}
            hitbox={{ top: 12, right: 12, bottom: 12, left: 12 }}
            id="places"
            onPress={(e) => {
              const feature = e.nativeEvent.features[0];
              if (!feature?.geometry || feature.geometry.type !== "Point") {
                return;
              }
              const pin = pinsById.get(String(feature.properties?.id));
              if (pin) select(pin);
            }}
          >
            <Layer
              filter={["==", ["get", "kind"], "place"]}
              id="place-dots"
              paint={{
                "circle-color": colors.primary,
                "circle-radius": [
                  "interpolate",
                  ["linear"],
                  ["zoom"],
                  12,
                  4.5,
                  17,
                  7,
                ],
                "circle-stroke-color": colors.surface,
                "circle-stroke-width": 2,
              }}
              type="circle"
            />
          </GeoJSONSource>

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

          {clusters.map((c) => {
            const size = c.count >= 500 ? 46 : c.count >= 50 ? 40 : 34;
            return (
              <ViewAnnotation
                anchor="center"
                id={`cluster-${c.lng}-${c.lat}`}
                key={`cluster-${c.lng}-${c.lat}-${c.count}`}
                lngLat={[c.lng, c.lat]}
                onPress={() => zoomInto(c.lng, c.lat)}
              >
                <View
                  className="items-center justify-center rounded-full"
                  style={{
                    boxShadow: PIN_SHADOW,
                    minWidth: size,
                    height: size,
                    paddingHorizontal: 8,
                    backgroundColor: colors.primary,
                    borderWidth: 2,
                    borderColor: colors.surface,
                  }}
                >
                  <ThemedText size="sm" tone="inverse" weight="bold">
                    {countLabel(c.count)}
                  </ThemedText>
                </View>
              </ViewAnnotation>
            );
          })}

          {ratingPills.map((pin) => (
            <ViewAnnotation
              anchor="center"
              id={pin.id}
              key={pin.id}
              lngLat={[pin.lng, pin.lat]}
              onPress={() => select(pin)}
            >
              <View
                className="flex-row items-center gap-1 rounded-full"
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 4,
                  backgroundColor: colors.surface,
                  borderWidth: 1.5,
                  borderColor: colors.muted,
                  boxShadow: PIN_SHADOW,
                }}
              >
                <FilledStar color={colors.rating} size={11} />
                <ThemedText size="xs" weight="semibold">
                  {Number(pin.rating).toFixed(1)}
                </ThemedText>
              </View>
            </ViewAnnotation>
          ))}

          {/* The picked place, named, so it's clear which one the card is. */}
          {selected ? (
            <ViewAnnotation
              anchor="center"
              id="selected"
              key={`selected-${selected.id}`}
              lngLat={[selected.lng, selected.lat]}
            >
              <View
                className="flex-row items-center rounded-full"
                style={{
                  maxWidth: 200,
                  paddingHorizontal: 11,
                  paddingVertical: 5,
                  backgroundColor: colors.primary,
                  borderWidth: 2,
                  borderColor: colors.surface,
                  boxShadow: PIN_SHADOW,
                }}
              >
                <ThemedText
                  numberOfLines={1}
                  size="xs"
                  tone="inverse"
                  weight="semibold"
                >
                  {selected.name}
                </ThemedText>
              </View>
            </ViewAnnotation>
          ) : null}
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

      {/* One status pill: first load, then "nothing here". */}
      {firstLoad || empty ? (
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
            {firstLoad ? (
              <ActivityIndicator color={colors.muted} size="small" />
            ) : null}
            <ThemedText size="sm" tone="muted" weight="medium">
              {firstLoad
                ? "Finding places"
                : noMatches
                  ? "No matches"
                  : filtered
                    ? "No matches in this area"
                    : "No places here yet"}
            </ThemedText>
          </View>
        </Animated.View>
      ) : null}

      {/* Center on me — above the cards when they're showing. */}
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

      {selected && carouselPins.some((p) => p.id === selected.id) ? (
        <ResultCarousel
          onOpen={onOpen}
          onSelect={(pin) => {
            setPick((prev) =>
              prev
                ? {
                    ...prev,
                    selected: {
                      id: pin.id,
                      lat: pin.lat,
                      lng: pin.lng,
                      name: pin.placeName,
                    },
                  }
                : prev,
            );
            // Follow the swipe without zooming.
            cameraRef.current?.easeTo({
              center: [pin.lng, pin.lat],
              duration: 350,
            });
          }}
          pins={carouselPins}
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
              displayWidth={84}
              style={{ width: "100%", height: "100%" }}
              thumbhash={branch.coverPhotoThumbhash}
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
