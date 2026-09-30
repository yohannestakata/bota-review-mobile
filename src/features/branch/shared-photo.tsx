import { Image } from "expo-image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useWindowDimensions, type View } from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from "react-native-reanimated";

import { heroPhotoUrl, sizedPhotoUrl } from "@/components/ui/photo";
import { useColors } from "@/lib/theme";

import { BranchHeaderButtons } from "./components/branch-header-buttons";

import {
  flightProgress,
  HERO_HEIGHT,
  heroCovered,
  SHEET_OVERLAP,
  sheetTravel,
} from "./hero-shared";

// "Photo grows into the place page": the tapped card's cover is measured and a
// copy flies from there to the place page's hero while the page's sheet rises
// from the bottom to meet it. Both follow `flightProgress`, so they land on
// the same frame.
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
  /** Whether the place is saved, for the heart the flight fades in. */
  saved?: boolean;
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
  flightProgress.set(1);
  if (safety) clearTimeout(safety);
  emit();
}

/** Start a flight (call just before navigating to the place). */
export function startPhotoFlight(flight: PhotoFlight) {
  current = flight;
  pageMounted = false;
  heroCovered.set(1);
  // Holds the page's sheet below the screen until the flight starts.
  flightProgress.set(0);
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

/**
 * For a card that opens a place: put `ref` on its cover photo and call
 * `open` on press. The cover's on-screen position is handed to the place
 * page so the photo flies from here into its header. Reduce Motion (or no
 * photo) just opens the page.
 */
export function usePhotoFlight() {
  const reduced = useReducedMotion();
  const ref = useRef<View>(null);

  function open(
    card: {
      branchId: string;
      uri: string | null | undefined;
      radius: number;
      saved?: boolean;
    },
    navigate: () => void,
  ) {
    const { uri } = card;
    if (reduced || !uri || !ref.current) {
      navigate();
      return;
    }
    ref.current.measureInWindow((x, y, width, height) => {
      startPhotoFlight({
        branchId: card.branchId,
        uri,
        from: { x, y, width, height },
        radius: card.radius,
        saved: card.saved,
      });
      navigate();
    });
  }

  return { ref, open };
}

/**
 * False while a card photo is flying in. Heavy native views (the map) wait
 * for this: creating them mid-flight stalls the UI thread and the photo
 * visibly stops short, then jumps into place.
 */
export function usePhotoFlightDone() {
  return useSyncExternalStore(subscribe, () => current === null);
}

// One element moving across the screen: in-out with a soft landing.
const FLIGHT = { duration: 350, easing: Easing.bezier(0.32, 0.72, 0, 1) };

// The page's sheet has rounded top corners (rounded-t-3xl) and overlaps the
// hero's bottom. This copy is drawn above the page, so it draws the sheet's
// top edge itself wherever the rising sheet reaches it; its last frame is
// then exactly the real page.
const SHEET_RADIUS = 21;

const noop = () => {};

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
  const { width, height: screenH } = useWindowDimensions();
  const colors = useColors();
  const progress = flightProgress;
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
      height: interpolate(p, [0, 1], [flight.from.height, HERO_HEIGHT]),
      borderRadius: interpolate(p, [0, 1], [flight.radius, 0]),
      overflow: "hidden",
      // Gone the instant it lands, even before JS unmounts it.
      opacity: heroCovered.get(),
    };
  });

  // The sheet's top edge, relative to this copy; clipped away until the
  // sheet reaches the photo's bottom.
  const travel = sheetTravel(screenH);
  const sheetEdge = useAnimatedStyle(() => {
    const p = progress.get();
    const photoTop = interpolate(p, [0, 1], [flight.from.y, 0]);
    const sheetTop = HERO_HEIGHT - SHEET_OVERLAP + (1 - p) * travel;
    return { top: sheetTop - photoTop };
  });

  // The page's back and heart buttons sit under this copy, so it fades in its
  // own over the last stretch; the real ones show on the landing frame.
  const buttons = useAnimatedStyle(() => ({
    opacity:
      interpolate(progress.get(), [0.6, 1], [0, 1], "clamp") *
      heroCovered.get(),
  }));

  return (
    <>
      <Animated.View pointerEvents="none" style={style}>
        {/* Starts as the card's copy (already on screen, so cached) and
            swaps to the header-size one the tap prefetched. */}
        <Image
          contentFit="cover"
          placeholder={{ uri: sizedPhotoUrl(flight.uri, flight.from.width) }}
          placeholderContentFit="cover"
          source={heroPhotoUrl(flight.uri)}
          style={{ width: "100%", height: "100%" }}
        />
        {/* The top edge of the page's sheet, with its rounded corners. */}
        <Animated.View
          style={[
            {
              position: "absolute",
              left: 0,
              right: 0,
              height: SHEET_OVERLAP * 2,
              backgroundColor: colors.background,
              borderTopLeftRadius: SHEET_RADIUS,
              borderTopRightRadius: SHEET_RADIUS,
            },
            sheetEdge,
          ]}
        />
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[{ position: "absolute", top: 0, left: 0, right: 0 }, buttons]}
      >
        <BranchHeaderButtons
          isSaved={flight.saved ?? false}
          onBack={noop}
          onToggleSave={noop}
          preview
        />
      </Animated.View>
    </>
  );
}
