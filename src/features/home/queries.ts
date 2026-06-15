import { useAuth } from "@clerk/clerk-expo";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { useSearch, useTags } from "@/features/search";
import { debugLog } from "@/lib/debug";
import {
  getCollection,
  getHome,
  getSavedBranchIds,
  getSaves,
  saveBranch,
  unsaveBranch,
} from "./api";
import { mealTimeNow } from "./meal-time";

export const homeKeys = {
  all: ["home"] as const,
  feed: () => [...homeKeys.all, "feed"] as const,
  savedIds: () => [...homeKeys.all, "saved-ids"] as const,
  saves: () => [...homeKeys.all, "saves"] as const,
};

export function useSaves() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: homeKeys.saves(),
    queryFn: () => getSaves(getToken),
  });
}

export function useHomeFeed() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: homeKeys.feed(),
    queryFn: () => getHome(getToken),
  });
}

// Time-of-day rail: filters by the current meal-time tag, sorted by distance
// when location is available.
export function useMealRail(coords: { lat: number; lng: number } | null) {
  const meal = mealTimeNow();
  const tags = useTags();
  const tagId = tags.data?.find((tag) => tag.slug === meal.slug)?.id;

  const query = useSearch({
    q: "",
    tagId: tagId ? [tagId] : undefined,
    lat: coords?.lat,
    lng: coords?.lng,
    sort: coords ? "distance" : "rating",
    limit: 10,
  });

  return { label: meal.label, query };
}

export function useCollection(slug: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [...homeKeys.all, "collection", slug],
    queryFn: () => getCollection(slug, getToken),
    enabled: Boolean(slug),
  });
}

// Returns the user's saved branch IDs as a Set for O(1) membership checks on
// cards. The cache stores the raw string[] so optimistic writes are simple.
export function useSavedBranchIds() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: homeKeys.savedIds(),
    queryFn: async () => (await getSavedBranchIds(getToken)).branchIds,
    select: (ids) => new Set(ids),
  });
}

type ToggleSaveVars = { branchId: string; isSaved: boolean };
type ToggleSaveContext = { previous?: string[] };

export function useToggleSave() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<void, Error, ToggleSaveVars, ToggleSaveContext>({
    mutationFn: async ({ branchId, isSaved }) => {
      if (isSaved) {
        await unsaveBranch(branchId, getToken);
      } else {
        await saveBranch(branchId, getToken);
      }
    },
    onMutate: async ({ branchId, isSaved }) => {
      await queryClient.cancelQueries({ queryKey: homeKeys.savedIds() });
      const previous = queryClient.getQueryData<string[]>(homeKeys.savedIds());

      queryClient.setQueryData<string[]>(homeKeys.savedIds(), (ids = []) =>
        isSaved ? ids.filter((id) => id !== branchId) : [...ids, branchId],
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      debugLog("home", "toggle save failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      if (context?.previous) {
        queryClient.setQueryData(homeKeys.savedIds(), context.previous);
      }
    },
    onSettled: () => {
      // Refresh the saved-branches list so the Saved tab reflects the change.
      void queryClient.invalidateQueries({ queryKey: homeKeys.saves() });
    },
  });
}
