import { makeMutable } from "react-native-reanimated";

// Shared between the place page's hero and the card-photo flight, kept in
// their own module so neither imports the other (a cycle left one undefined).

export const HERO_HEIGHT = 360;

/** 1 while a flying card photo covers the hero; the hero hides its own then. */
export const heroCovered = makeMutable(0);
