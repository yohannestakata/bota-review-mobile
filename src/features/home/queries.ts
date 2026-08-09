import { useAuth } from "@clerk/clerk-expo";
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { debugLog } from "@/lib/debug";
import {
  getCollection,
  getForYou,
  getHome,
  getPlace,
  getSavedBranchIds,
  getSaves,
  getTastePreferences,
  getTasteOptions,
  saveBranch,
  unsaveBranch,
  replaceTastePreferences,
} from "./api";

export const homeKeys = {
  all: ["home"] as const,
  feed: (coords: { lat: number; lng: number } | null) =>
    [...homeKeys.all, "feed", coords?.lat, coords?.lng] as const,
  savedIds: (userId: string | null | undefined) =>
    [...homeKeys.all, "saved-ids", userId ?? "anonymous"] as const,
  saves: (userId: string | null | undefined) =>
    [...homeKeys.all, "saves", userId ?? "anonymous"] as const,
  place: (id: string) => [...homeKeys.all, "place", id] as const,
  forYou: (userId: string | null | undefined) =>
    [...homeKeys.all, "for-you", userId ?? "anonymous"] as const,
  tastes: (userId: string | null | undefined) =>
    [...homeKeys.all, "tastes", userId ?? "anonymous"] as const,
  tasteOptions: () => [...homeKeys.all, "taste-options"] as const,
};

export function useSaves() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: homeKeys.saves(userId),
    queryFn: () => getSaves(getToken),
    enabled: isSignedIn === true,
  });
}

export function useForYou() {
  const { getToken, isSignedIn, userId } = useAuth();
  return useQuery({
    queryKey: homeKeys.forYou(userId),
    queryFn: () => getForYou(getToken),
    enabled: isSignedIn === true,
  });
}

export function useTastePreferencesQuery() {
  const { getToken, isSignedIn, userId } = useAuth();
  return useQuery({
    queryKey: homeKeys.tastes(userId),
    queryFn: () => getTastePreferences(getToken),
    enabled: isSignedIn === true,
  });
}

export function useTasteOptionsQuery() {
  const { getToken, isSignedIn } = useAuth();
  return useQuery({
    queryKey: homeKeys.tasteOptions(),
    queryFn: () => getTasteOptions(getToken),
    enabled: isSignedIn === true,
    staleTime: 30 * 60 * 1000,
  });
}

export function useReplaceTastePreferences() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    scope: { id: "taste-preferences" },
    mutationFn: (tasteOptionIds: string[]) =>
      replaceTastePreferences(tasteOptionIds, getToken),
    onSuccess: (preferences) => {
      queryClient.setQueryData(homeKeys.tastes(userId), preferences);
      void queryClient.invalidateQueries({ queryKey: homeKeys.forYou(userId) });
    },
  });
}

export function useHomeFeed(coords: { lat: number; lng: number } | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: homeKeys.feed(coords),
    queryFn: () => getHome(coords, getToken),
    placeholderData: keepPreviousData,
  });
}

export function useCollection(slug: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [...homeKeys.all, "collection", slug],
    queryFn: () => getCollection(slug, getToken),
    enabled: Boolean(slug),
  });
}

export function usePlace(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: homeKeys.place(id),
    queryFn: () => getPlace(id, getToken),
    enabled: Boolean(id),
  });
}

// Returns the user's saved branch IDs as a Set for O(1) membership checks on
// cards. The cache stores the raw string[] so optimistic writes are simple.
export function useSavedBranchIds() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: homeKeys.savedIds(userId),
    queryFn: async () => (await getSavedBranchIds(getToken)).branchIds,
    enabled: isSignedIn === true,
    select: (ids) => new Set(ids),
  });
}

type ToggleSaveVars = { branchId: string; isSaved: boolean };
type ToggleSaveContext = { previous?: string[] };

export function useToggleSave() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const savedIdsKey = homeKeys.savedIds(userId);
  const savesKey = homeKeys.saves(userId);

  return useMutation<void, Error, ToggleSaveVars, ToggleSaveContext>({
    mutationFn: async ({ branchId, isSaved }) => {
      if (!userId) {
        throw new Error("Sign in to save places");
      }

      if (isSaved) {
        await unsaveBranch(branchId, getToken);
      } else {
        await saveBranch(branchId, getToken);
      }
    },
    onMutate: async ({ branchId, isSaved }) => {
      if (!userId) {
        return {};
      }

      await queryClient.cancelQueries({ queryKey: savedIdsKey });
      const previous = queryClient.getQueryData<string[]>(savedIdsKey);

      queryClient.setQueryData<string[]>(savedIdsKey, (ids = []) =>
        isSaved ? ids.filter((id) => id !== branchId) : [...ids, branchId],
      );

      return { previous };
    },
    onError: (error, _vars, context) => {
      debugLog("home", "toggle save failed", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      if (context?.previous) {
        queryClient.setQueryData(savedIdsKey, context.previous);
      }
    },
    onSettled: () => {
      // Refresh the saved-branches list so the Saved tab reflects the change.
      void queryClient.invalidateQueries({ queryKey: savesKey });
    },
  });
}
