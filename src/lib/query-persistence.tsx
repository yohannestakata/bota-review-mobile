import { useAuth } from "@clerk/clerk-expo";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { useQueryClient, type Query } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import Constants from "expo-constants";
import { File, Paths } from "expo-file-system";

import { debugLog } from "@/lib/debug";

// Keeps a snapshot of the query cache on disk so a cold start shows the last
// home feed, place pages and profile instantly (then refreshes them) instead
// of skeletons. Stored in the OS cache directory: if the system clears it, the
// app simply loads from the network as before.

const file = () => new File(Paths.cache, "bota-query-cache.json");

// A tiny AsyncStorage-shaped adapter over one file. Every failure is logged
// and swallowed — persistence is a speed-up, never a blocker.
const fileStorage = {
  async getItem(): Promise<string | null> {
    try {
      const f = file();
      return f.exists ? await f.text() : null;
    } catch (error) {
      debugLog("query-persist", "read failed", { error: String(error) });
      return null;
    }
  },
  async setItem(_key: string, value: string) {
    try {
      file().write(value);
    } catch (error) {
      debugLog("query-persist", "write failed", { error: String(error) });
    }
  },
  async removeItem() {
    try {
      const f = file();
      if (f.exists) f.delete();
    } catch (error) {
      debugLog("query-persist", "delete failed", { error: String(error) });
    }
  },
};

export const queryPersister = createAsyncStoragePersister({
  storage: fileStorage,
  // Writes are batched; the cache changes often while browsing.
  throttleTime: 2000,
});

/** Cached data older than this is thrown away instead of shown. */
export const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24;

// A new app version may change response shapes, so it starts fresh.
export const PERSIST_BUSTER = Constants.expoConfig?.version ?? "1";

// Only what makes the next launch feel instant. Searches, claims, device
// lists (already on disk) and one-off lookups aren't worth the disk writes.
const PERSISTED_ROOTS = new Set(["home", "branch", "taxonomy", "profile"]);

export function shouldPersistQuery(query: Query) {
  const root = query.queryKey[0];
  // Anything with data — including a query whose latest refresh failed (it
  // keeps its last good data), so an offline launch doesn't erase the cache.
  return (
    query.state.data !== undefined &&
    typeof root === "string" &&
    PERSISTED_ROOTS.has(root)
  );
}

/**
 * When a signed-in user signs out, drop the in-memory cache and the on-disk
 * snapshot so the next person on a shared phone never sees their data.
 */
export function ClearCacheOnSignOut() {
  const { isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previous = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!isLoaded) return;
    if (previous.current && !userId) {
      queryClient.clear();
      void queryPersister.removeClient();
    }
    previous.current = userId;
  }, [isLoaded, userId, queryClient]);

  return null;
}
