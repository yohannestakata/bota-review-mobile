import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";

import { toast } from "@/components/ui/toast";

import { replaceTastePreferences, type TasteOption } from "./api";
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
  const { userId, getToken } = useAuth();
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
    version += 1;
    scheduleSave(queryClient, userId, getToken);
  }

  return {
    tasteOptionIds,
    toggle,
    ready: query.isSuccess,
  };
}
