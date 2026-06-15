import { QueryClient } from "@tanstack/react-query";

// Single app-wide client. Feeds and taxonomy change rarely, so default to a
// minute of freshness and a single retry to avoid hammering on flaky networks.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
