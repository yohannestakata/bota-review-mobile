import { useAuth } from "@clerk/clerk-expo";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as SecureStore from "expo-secure-store";
import { useCallback } from "react";

import { debugLog } from "@/lib/debug";

// A small most-recent-first list kept on the device (recent searches, recently
// viewed places). Scoped per signed-in user so a shared phone doesn't leak one
// person's history to another. Backed by the query cache so every screen using
// the same list sees updates immediately. Storage failures are logged and
// swallowed — this is a convenience, never a blocker.
//
// Keep entries tiny: SecureStore values should stay well under 2 KB.
export function useDeviceList<T>(
  name: string,
  { max, idOf }: { max: number; idOf: (item: T) => string },
) {
  const { userId } = useAuth();
  const queryClient = useQueryClient();
  // SecureStore keys allow only [A-Za-z0-9._-].
  const storageKey = `bota.${name}.${userId ?? "guest"}`;
  const queryKey = ["device-list", storageKey];

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<T[]> => {
      try {
        const raw = await SecureStore.getItemAsync(storageKey);
        return raw ? (JSON.parse(raw) as T[]) : [];
      } catch (error) {
        debugLog("device-list", "read failed", { name, error: String(error) });
        return [];
      }
    },
    staleTime: Infinity,
  });

  const write = useCallback(
    (update: (items: T[]) => T[]) => {
      const next = update(queryClient.getQueryData<T[]>(queryKey) ?? []).slice(
        0,
        max,
      );
      queryClient.setQueryData(queryKey, next);
      SecureStore.setItemAsync(storageKey, JSON.stringify(next)).catch(
        (error: unknown) =>
          debugLog("device-list", "write failed", {
            name,
            error: String(error),
          }),
      );
    },
    // queryKey is derived from storageKey.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [queryClient, storageKey, max, name],
  );

  /** Adds (or moves) an item to the front. */
  const add = useCallback(
    (item: T) =>
      write((items) => [
        item,
        ...items.filter((existing) => idOf(existing) !== idOf(item)),
      ]),
    [write, idOf],
  );
  const remove = useCallback(
    (id: string) => write((items) => items.filter((i) => idOf(i) !== id)),
    [write, idOf],
  );
  const clear = useCallback(() => write(() => []), [write]);

  return {
    items: query.data ?? [],
    ready: query.isSuccess,
    add,
    remove,
    clear,
  };
}
