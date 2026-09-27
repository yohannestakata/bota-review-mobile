import { Image } from "expo-image";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useWindowDimensions } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { HERO_HEIGHT, heroCovered } from "./hero-shared";

// "Photo grows into the place page": the tapped card's cover is measured and a
// copy flies from there to the place page's hero while the page fades in.
//
// The flying copy is drawn by PhotoFlightHost at the app root — above every
// screen — so it's fully visible from the first frame. The swap to the real
// hero happens on the UI thread, on the landing frame, via `heroCovered`:
// the JS thread is busy building the new page at that moment, so a JS-side
// handoff would leave the copy covering the page's buttons for a beat.
// A plain overlay rather than Reanimated's shared transitions, which are
// experimental and don't support tab navigators.

type Rect = { x: number; y: number; width: number; height: number };
export type PhotoFlight = {
  branchId: string;
  uri: string;
  from: Rect;
  radius: number;
};

let current: PhotoFlight | null = null;
let pageMounted = false;
const listeners = new Set<() => void>();
let safety: ReturnType<typeof setTimeout> | null = null;

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function endFlight() {
  current = null;
  pageMounted = false;
  heroCovered.set(0);
  if (safety) clearTimeout(safety);
  emit();
}

/** Start a flight (call just before navigating to the place). */
export function startPhotoFlight(flight: PhotoFlight) {
  current = flight;
  pageMounted = false;
  heroCovered.set(1);
  // Never leave a stray photo on screen if the page doesn't show up.
  if (safety) clearTimeout(safety);
  safety = setTimeout(endFlight, 2500);
  emit();
}

/** Whether a flight is heading to this place (decides the push animation). */
export function hasPendingPhotoFlight(branchId: string) {
  return current?.branchId === branchId;
}

/**
 * For the place page: tells the flight it has mounted. Mounting is heavy and
 * stalls drawing for a moment, so the flight waits for it — otherwise its
 * first frames would be skipped and the photo would appear to jump.
 */
export function usePhotoFlightTarget(branchId: string) {
  useEffect(() => {
    if (current?.branchId === branchId) {
      pageMounted = true;
      emit();
    }
  }, [branchId]);
}

// One element moving across the screen: in-out with a soft landing.
const FLIGHT = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };

// The page's sheet overlaps the hero's bottom by this much (its -mt-6), with
// rounded corners; landing just above it keeps those corners on top.
const SHEET_OVERLAP = 21;

/** Mounted once at the app root, above the navigator. */
export function PhotoFlightHost() {
  const flight = useSyncExternalStore(subscribe, () => current);
  if (!flight) return null;
  // Keyed so each flight starts from its own card.
  return (
    <FlyingPhoto flight={flight} key={`${flight.branchId}-${flight.uri}`} />
  );
}

function FlyingPhoto({ flight }: { flight: PhotoFlight }) {
  const { width } = useWindowDimensions();
  const progress = useSharedValue(0);
  const mounted = useSyncExternalStore(subscribe, () => pageMounted);
  const [timedOut, setTimedOut] = useState(false);

  // Don't wait forever for a slow page.
  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), 350);
    return () => clearTimeout(t);
  }, []);

  // Start on the frame after the page's first draw, holding at the card until
  // then (it reads as the card lifting off).
  const go = mounted || timedOut;
  useEffect(() => {
    if (!go) return;
    const raf = requestAnimationFrame(() => {
      progress.set(
        withTiming(1, FLIGHT, (done) => {
          if (!done) return;
          // Same frame: reveal the real hero, hide this copy.
          heroCovered.set(0);
          runOnJS(endFlight)();
        }),
      );
    });
    return () => cancelAnimationFrame(raf);
  }, [go, progress]);

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
      // Gone the instant it lands, even before JS unmounts it.
      opacity: heroCovered.get(),
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
