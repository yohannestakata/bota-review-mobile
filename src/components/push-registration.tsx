import { useAuth } from "@clerk/clerk-expo";
import * as Notifications from "expo-notifications";
import { useEffect } from "react";

import { debugLog } from "@/lib/debug";
import { notificationsAllowed } from "@/lib/push-notifications";
import { syncPushRegistration } from "@/lib/push-registration";

/**
 * Root-mounted (inside ClerkProvider). Silently re-registers a returning user's
 * push token on launch when permission was already granted — it does NOT
 * prompt. The in-context permission ask happens after a meaningful action (see
 * promptAndRegisterPush). Renders nothing.
 */
export function PushRegistration() {
  const { isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    void (async () => {
      try {
        const permission = await Notifications.getPermissionsAsync();
        if (notificationsAllowed(permission)) {
          await syncPushRegistration(getToken);
        }
      } catch (error) {
        debugLog("notifications", "launch registration failed", {
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
  }, [isSignedIn, getToken]);

  return null;
}
