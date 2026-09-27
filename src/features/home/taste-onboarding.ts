import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useCallback } from "react";

import { debugLog } from "@/lib/debug";

// Whether this user has been through the first-launch taste picker on this
// device (finished or skipped). Kept per user so a shared phone asks each
// person once. Storage failures count as "seen" — never nag because of them.

const key = (userId: string) => `bota.taste-onboarding.${userId}`;
const queryKey = (userId: string | null | undefined) => [
  "device-flag",
  "taste-onboarding",
  userId ?? "guest",
];

export function useTasteOnboarding() {
  const { userId } = useAuth();
  const queryClient = useQueryClient();

  const seen = useQuery({
    queryKey: queryKey(userId),
    queryFn: async () => {
      try {
        return (await SecureStore.getItemAsync(key(userId!))) === "1";
      } catch (error) {
        debugLog("taste-onboarding", "read failed", { error: String(error) });
        return true;
      }
    },
    enabled: Boolean(userId),
    staleTime: Infinity,
  });

  const markSeen = useCallback(() => {
    if (!userId) return;
    queryClient.setQueryData(queryKey(userId), true);
    SecureStore.setItemAsync(key(userId), "1").catch(() => {});
  }, [userId, queryClient]);

  return {
    ready: seen.isSuccess,
    seen: seen.data ?? false,
    markSeen,
  };
}
