import * as SplashScreen from "expo-splash-screen";

// The splash stays up until the first real screen can draw, so launch goes
// splash → filled screen rather than splash → loading state → screen. It fades
// out instead of cutting away.

let hidden = false;

SplashScreen.setOptions({ duration: 250, fade: true });

/** Hide the splash (safe to call more than once). */
export function hideSplash() {
  if (hidden) return;
  hidden = true;
  void SplashScreen.hideAsync();
}

/** Tab routes wait for the tabs to be ready before the splash hides. */
export const TAB_ROOT_PATHS = new Set([
  "/",
  "/search",
  "/saved",
  "/submissions",
  "/profile",
]);

/** Longest the splash waits for a screen to be ready. */
export const SPLASH_MAX_WAIT_MS = 3000;
