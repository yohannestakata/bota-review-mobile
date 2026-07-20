import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { debugLog } from "@/lib/debug";

// Android 13+ requires notification channels to exist before permission is
// requested or a token is issued. These mirror the notification categories the
// server sends (see notification-routing) so the OS settings stay legible and a
// user can mute one category without losing the rest.
export const PUSH_CHANNELS: { id: string; name: string }[] = [
  { id: "social", name: "Replies & responses" },
  { id: "contributions", name: "Your contributions" },
  { id: "saved", name: "Saved places" },
  { id: "discovery", name: "New on Bota" },
];

/**
 * Whether the current permission actually lets us show notifications — granted
 * outright, or iOS provisional (quiet delivery).
 */
export function notificationsAllowed(
  permission: Notifications.NotificationPermissionsStatus,
) {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function ensurePushChannels() {
  if (Platform.OS !== "android") return;
  await Promise.all(
    PUSH_CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        importance: Notifications.AndroidImportance.DEFAULT,
      }),
    ),
  );
}

/**
 * In-context permission request. Call this right after a meaningful action
 * (first save, review, or reply) — Apple and Android both recommend asking then
 * rather than on launch. Returns whether notifications are now allowed; never
 * throws, so callers can treat it as best-effort.
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    await ensurePushChannels();
    let permission = await Notifications.getPermissionsAsync();
    if (!notificationsAllowed(permission)) {
      permission = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
    }
    return notificationsAllowed(permission);
  } catch (error) {
    debugLog("notifications", "permission request failed", {
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
}

function resolveProjectId(): string | null {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

/**
 * Resolve this device's Expo push token, or null when we can't get one (no
 * physical device, missing projectId, permission not granted, or a transient
 * failure). Assumes permission was already handled by the caller.
 */
export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const projectId = resolveProjectId();
  if (!projectId) {
    debugLog("notifications", "no EAS projectId — cannot issue push token");
    return null;
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    if (!notificationsAllowed(permission)) return null;
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    return token.data;
  } catch (error) {
    debugLog("notifications", "failed to get push token", {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
