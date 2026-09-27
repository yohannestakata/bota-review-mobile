import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { toast } from "@/components/ui/toast";

import { replaceTastePreferences, type TasteOption } from "./api";
import { readGuestTastes, writeGuestTastes } from "./guest-tastes";
import { markTasteOnboardingSeen } from "./taste-onboarding";
import { homeKeys, useTastePreferencesQuery } from "./queries";

// Taps apply to the cache instantly; the save goes out once tapping pauses.
// Shared across every screen using the hook (home card, tastes screen), so a
// burst of taps anywhere becomes one request with the final selection.
const SAVE_DELAY_MS = 600;
let saveTimer: ReturnType<typeof setTimeout> | null = null;
// Bumped on every tap. A response is only written back if no tap happened
// since its request was sent — otherwise it would overwrite newer picks and
// the chips would flicker back and forth.
let version = 0;

function scheduleSave(
  queryClient: QueryClient,
  userId: string | null | undefined,
  getToken: Parameters<typeof replaceTastePreferences>[1],
) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const key = homeKeys.tastes(userId);
    const sent = version;
    const ids = (queryClient.getQueryData<TasteOption[]>(key) ?? []).map(
      (option) => option.id,
    );
    replaceTastePreferences(ids, getToken)
      .then((preferences) => {
        if (sent === version) queryClient.setQueryData(key, preferences);
        void queryClient.invalidateQueries({
          queryKey: homeKeys.forYou(userId),
        });
      })
      .catch(() => {
        if (sent !== version) return;
        toast.error("Couldn't save your picks", "Check your connection.");
        void queryClient.invalidateQueries({ queryKey: key });
      });
  }, SAVE_DELAY_MS);
}

export function useTastePreferences() {
  const { userId, getToken, isSignedIn } = useAuth();
  const query = useTastePreferencesQuery();
  const queryClient = useQueryClient();
  const tasteOptionIds = (query.data ?? []).map((option) => option.id);

  function toggle(tasteOptionId: string) {
    const key = homeKeys.tastes(userId);
    // A refetch landing mid-burst would also reset the chips.
    void queryClient.cancelQueries({ queryKey: key });
    const current = queryClient.getQueryData<TasteOption[]>(key) ?? [];
    const next = current.some((option) => option.id === tasteOptionId)
      ? current.filter((option) => option.id !== tasteOptionId)
      : [...current, { id: tasteOptionId } as TasteOption];
    queryClient.setQueryData(key, next);
    if (!isSignedIn) {
      // Guests: kept on the device; "For you" re-keys on the new picks.
      writeGuestTastes(next.map((option) => option.id));
      return;
    }
    version += 1;
    scheduleSave(queryClient, userId, getToken);
  }

  return {
    tasteOptionIds,
    toggle,
    ready: query.isSuccess,
  };
}

/**
 * On sign-in, move taste picks made while signed out onto the account — unless
 * the account already has its own tastes, which win. Either way the device
 * copy is cleared. Returns false until that check has run, so the taste
 * onboarding doesn't open for someone whose picks are about to arrive.
 */
export function useMigrateGuestTastes() {
  const { isLoaded, isSignedIn, userId, getToken } = useAuth();
  const queryClient = useQueryClient();
  const accountTastes = useTastePreferencesQuery();
  const handledFor = useRef<string | null>(null);
  const [settledFor, setSettledFor] = useState<string | null>(null);

  const accountEmpty =
    accountTastes.isSuccess && (accountTastes.data ?? []).length === 0;
  const accountReady = accountTastes.isSuccess;

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId || !accountReady) return;
    if (handledFor.current === userId) return;
    handledFor.current = userId;

    void (async () => {
      const guestIds = await readGuestTastes();
      if (guestIds.length > 0) {
        if (accountEmpty) {
          try {
            const saved = await replaceTastePreferences(guestIds, getToken);
            queryClient.setQueryData(homeKeys.tastes(userId), saved);
            void queryClient.invalidateQueries({
              queryKey: homeKeys.forYou(userId),
            });
          } catch {
            // Keep the device copy to try again next launch.
            setSettledFor(userId);
            handledFor.current = null;
            return;
          }
        }
        // They've already told us their tastes — don't ask again.
        markTasteOnboardingSeen(userId);
        writeGuestTastes([]);
      }
      setSettledFor(userId);
    })();
  }, [
    isLoaded,
    isSignedIn,
    userId,
    accountReady,
    accountEmpty,
    getToken,
    queryClient,
  ]);

  return !isSignedIn || settledFor === userId;
}
