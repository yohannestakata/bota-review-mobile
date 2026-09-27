import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useCallback } from "react";

import { debugLog } from "@/lib/debug";

// Whether this user has been through the first-launch taste picker on this
// device (finished or skipped). Kept per user so a shared phone asks each
// person once. Storage failures count as "seen" — never nag because of them.

// Per user; signed-out people share the "guest" slot on this device.
const key = (userId: string | null | undefined) =>
  `bota.taste-onboarding.${userId ?? "guest"}`;
const queryKey = (userId: string | null | undefined) => [
  "device-flag",
  "taste-onboarding",
  userId ?? "guest",
];

/** Record a user as done with the taste picker without showing it. */
export function markTasteOnboardingSeen(userId: string) {
  SecureStore.setItemAsync(key(userId), "1").catch(() => {});
}

export function useTasteOnboarding() {
  const { userId, isLoaded } = useAuth();
  const queryClient = useQueryClient();

  const seen = useQuery({
    queryKey: queryKey(userId),
    queryFn: async () => {
      try {
        return (await SecureStore.getItemAsync(key(userId))) === "1";
      } catch (error) {
        debugLog("taste-onboarding", "read failed", { error: String(error) });
        return true;
      }
    },
    enabled: isLoaded,
    staleTime: Infinity,
  });

  const markSeen = useCallback(() => {
    queryClient.setQueryData(queryKey(userId), true);
    SecureStore.setItemAsync(key(userId), "1").catch(() => {});
  }, [userId, queryClient]);

  return {
    ready: seen.isSuccess,
    seen: seen.data ?? false,
    markSeen,
  };
}
