import * as SecureStore from "expo-secure-store";
import { Linking, Platform } from "react-native";

import { Alert } from "@/components/ui/alert";
import { debugLog } from "@/lib/debug";

const NUDGE_SHOWN_KEY = "bota.battery-nudge-shown";

/**
 * One-time, Play-compliant nudge (Android only): after notifications are on,
 * suggest exempting Bota from battery optimization so pushes arrive reliably
 * even when the app is swiped away. We only *guide* the user to Settings — we
 * never request the restricted REQUEST_IGNORE_BATTERY_OPTIMIZATIONS permission.
 * Shown at most once (dismissible); never throws.
 */
export async function maybeSuggestBackgroundAccess(): Promise<void> {
  if (Platform.OS !== "android") return;
  try {
    const shown = await SecureStore.getItemAsync(NUDGE_SHOWN_KEY);
    if (shown) return;
    await SecureStore.setItemAsync(NUDGE_SHOWN_KEY, "1");

    Alert.alert(
      "Get updates the moment they happen",
      "Some phones pause apps in the background, which can hold up notifications. To get Bota's replies and updates instantly, allow it to run in the background.",
      [
        { text: "Not now", style: "cancel" },
        {
          text: "Open settings",
          onPress: () => void Linking.openSettings(),
        },
      ],
    );
  } catch (error) {
    debugLog("notifications", "battery nudge failed", {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
