import { Image } from "expo-image";
import { useEffect } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { HERO_HEIGHT } from "./components/branch-hero";

// "Photo grows into the place page": the tapped card's cover is measured, and
// the place page flies a copy of it from there to its hero while the page
// fades in. A plain JS overlay rather than Reanimated's shared transitions,
// which are experimental and don't support tab navigators.

type Rect = { x: number; y: number; width: number; height: number };
export type PhotoFlight = {
  branchId: string;
  uri: string;
  from: Rect;
  radius: number;
  at: number;
};

let pending: PhotoFlight | null = null;
const FRESH_MS = 1500;

export function setPendingPhotoFlight(flight: Omit<PhotoFlight, "at">) {
  pending = { ...flight, at: Date.now() };
}

function fresh(branchId: string) {
  return pending &&
    pending.branchId === branchId &&
    Date.now() - pending.at < FRESH_MS
    ? pending
    : null;
}

/** Whether a flight is waiting for this place (decides the push animation). */
export function hasPendingPhotoFlight(branchId: string) {
  return fresh(branchId) !== null;
}

/** Claim the flight for this place, once. */
export function takePendingPhotoFlight(branchId: string) {
  const flight = fresh(branchId);
  pending = null;
  return flight;
}

// The page's sheet overlaps the hero's bottom by this much (its -mt-6), with
// rounded corners; landing just above it keeps those corners on top.
const SHEET_OVERLAP = 21;

// One element moving across the screen: in-out with a soft landing.
const FLIGHT = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };

/**
 * The flying photo. Rendered over the place page from its first frame; calls
 * onLanded when it has reached the hero's spot; the page then unmounts it
 * (keeping it a little longer if the page is still showing its skeleton).
 */
export function PhotoFlightOverlay({
  flight,
  onLanded,
}: {
  flight: PhotoFlight;
  onLanded: () => void;
}) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.set(
      withTiming(1, FLIGHT, (done) => {
        if (done) runOnJS(onLanded)();
      }),
    );
    // Once, on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const style = useAnimatedStyle(() => {
    const p = progress.get();
    return {
      position: "absolute",
      left: interpolate(p, [0, 1], [flight.from.x, 0]),
      top: interpolate(p, [0, 1], [flight.from.y, 0]),
      width: interpolate(p, [0, 1], [flight.from.width, width]),
      height: interpolate(
        p,
        [0, 1],
        [flight.from.height, HERO_HEIGHT - SHEET_OVERLAP],
      ),
      borderRadius: interpolate(p, [0, 1], [flight.radius, 0]),
      overflow: "hidden",
    };
  });

  return (
    <Animated.View pointerEvents="none" style={style}>
      <Image
        contentFit="cover"
        source={flight.uri}
        style={{ width: "100%", height: "100%" }}
      />
    </Animated.View>
  );
}
