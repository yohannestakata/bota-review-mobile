import { useAuth } from "@clerk/clerk-expo";
import { useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import { useCallback } from "react";

import { heroPhotoUrl } from "@/components/ui/photo";

import { getBranch } from "./api";
import { branchKeys } from "./keys";

/**
 * Warm a place page before it opens: call on press-in of a card. Starts the
 * detail request (skipped if cached data is still fresh) and the cover photo
 * download, so by the time the tap lands the page usually opens filled in.
 */
export function usePrefetchBranch() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useCallback(
    (branch: { id: string; coverPhotoUrl?: string | null }) => {
      void queryClient.prefetchQuery({
        queryKey: branchKeys.detail(branch.id),
        queryFn: () => getBranch(branch.id, getToken),
        staleTime: 60_000,
      });
      // The size the page's header shows, so the header finds it cached.
      if (branch.coverPhotoUrl) {
        void Image.prefetch(heroPhotoUrl(branch.coverPhotoUrl));
      }
    },
    [queryClient, getToken],
  );
}
