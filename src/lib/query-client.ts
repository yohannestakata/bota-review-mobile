import { QueryClient } from "@tanstack/react-query";

// Single app-wide client. Feeds and taxonomy change rarely, so default to a
// minute of freshness and a single retry to avoid hammering on flaky networks.
// Unused data is kept for a day so the on-disk snapshot (query-persistence)
// can restore it on the next launch.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 1000 * 60 * 60 * 24,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
