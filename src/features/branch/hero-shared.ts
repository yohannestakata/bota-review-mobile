import { makeMutable } from "react-native-reanimated";

// Shared between the place page's hero and the card-photo flight, kept in
// their own module so neither imports the other (a cycle left one undefined).

export const HERO_HEIGHT = 360;

/** How far the page's sheet overlaps the bottom of the hero (its -mt-6). */
export const SHEET_OVERLAP = 21;

/** 1 while a flying card photo covers the hero; the hero hides its own then. */
export const heroCovered = makeMutable(0);

/**
 * Progress of the card-photo flight, 0 → 1; 1 when no flight is running. The
 * flying photo and the page's sheet (which rises from the bottom) both read
 * it, so they move as one.
 */
export const flightProgress = makeMutable(1);

/** How far below its resting place the sheet starts during a flight. */
export function sheetTravel(screenHeight: number) {
  return screenHeight - (HERO_HEIGHT - SHEET_OVERLAP);
}
