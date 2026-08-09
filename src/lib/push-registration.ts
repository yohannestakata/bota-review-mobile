import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import {
  registerDeviceToken,
  unregisterDeviceToken,
  type TokenGetter,
} from "@/lib/api";
import { maybeSuggestBackgroundAccess } from "@/lib/battery-optimization";
import { debugLog } from "@/lib/debug";
import {
  ensureNotificationPermission,
  getExpoPushToken,
} from "@/lib/push-notifications";

// The token we last told the backend about — lets us skip redundant POSTs and
// know exactly what to remove on logout.
const REGISTERED_TOKEN_KEY = "bota.push-registered-token";

function currentPlatform(): "ios" | "android" | undefined {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return undefined;
}

/**
 * Acquire this device's push token and register it with the backend, but only
 * if it changed since last time. Assumes permission is already granted — used
 * for the silent re-register of a returning user on launch.
 */
export async function syncPushRegistration(getToken: TokenGetter) {
  const token = await getExpoPushToken();
  if (!token) return;

  const last = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY);
  if (last === token) return;

  await registerDeviceToken({ token, platform: currentPlatform() }, getToken);
  await SecureStore.setItemAsync(REGISTERED_TOKEN_KEY, token);
  debugLog("notifications", "device token registered");
}

/**
 * In-context entry point: called after a meaningful action (first save, review,
 * or reply). Asks for permission if we don't have it yet, then registers. Safe
 * to call repeatedly — the OS only shows its dialog once, and a matching token
 * is a no-op. Never throws.
 */
export async function promptAndRegisterPush(getToken: TokenGetter) {
  try {
    const granted = await ensureNotificationPermission();
    if (!granted) return;
    await syncPushRegistration(getToken);
    // Right after enabling notifications is the moment to suggest background
    // access (Android), so swiped-away delivery works too. One-time, dismissible.
    await maybeSuggestBackgroundAccess();
  } catch (error) {
    debugLog("notifications", "push registration failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Remove this device's token, server-side and locally. Call BEFORE signing out,
 * while the auth token is still valid.
 */
export async function clearPushRegistration(getToken: TokenGetter) {
  const last = await SecureStore.getItemAsync(REGISTERED_TOKEN_KEY);
  if (!last) return;
  try {
    await unregisterDeviceToken(last, getToken);
  } catch (error) {
    // Best effort — the local delete below still stops us reusing it.
    debugLog("notifications", "failed to unregister token", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
  await SecureStore.deleteItemAsync(REGISTERED_TOKEN_KEY);
}
