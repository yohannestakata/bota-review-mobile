import { useState } from "react";

// Drives a RefreshControl from the user's pull only. Binding `refreshing` to a
// query's isRefetching/isFetching also turns it on for background fetches
// (typing a new search, invalidation after a save) — iOS then gets
// beginRefreshing while the control is offscreen, ignores it, and the spinner
// desyncs and can stay stuck. Here it's on exactly while a pull's refetch runs.
export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [refreshing, setRefreshing] = useState(false);

  async function onRefresh() {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  }

  return { refreshing, onRefresh };
}
