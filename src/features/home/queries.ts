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
  getGuestForYou,
  getHome,
  getPlace,
  getSavedBranchIds,
  type HomeBranchSection,
  getSaves,
  getTastePreferences,
  getTasteOptions,
  saveBranch,
  unsaveBranch,
  type TasteOption,
} from "./api";
import { readGuestTastes } from "./guest-tastes";
import { getDeviceId } from "@/lib/device-id";
import { useRecentlyViewed } from "@/lib/use-recently-viewed";

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

// The order "For you" was first shown in this session. A fresher list (the
// cached one is shown at launch, then re-ranked a moment later) keeps it, so
// cards don't swap places under the user's thumb; new places join the end.
let forYouOrder: string[] | null = null;

/** Let the next list set a new order (pull to refresh asks for a re-rank). */
export function resetForYouOrder() {
  forYouOrder = null;
}

function keepForYouOrder(section: HomeBranchSection): HomeBranchSection {
  if (!forYouOrder) {
    forYouOrder = section.items.map((item) => item.id);
    return section;
  }
  const rank = new Map(forYouOrder.map((id, i) => [id, i]));
  const items = [...section.items].sort(
    (a, b) =>
      (rank.get(a.id) ?? Number.MAX_SAFE_INTEGER) -
      (rank.get(b.id) ?? Number.MAX_SAFE_INTEGER),
  );
  forYouOrder = items.map((item) => item.id);
  return { ...section, items };
}

export function useForYou(coords: { lat: number; lng: number } | null) {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  // Guests: built from the tastes picked on this device.
  const guestTastes = useTastePreferencesQuery();
  const guestIds = isSignedIn
    ? []
    : (guestTastes.data ?? []).map((option) => option.id);
  const recentlyViewed = useRecentlyViewed();
  const viewed = recentlyViewed.items.slice(0, 10).map((place) => place.id);
  // ~1 km steps, so walking around doesn't refetch constantly.
  const near = coords
    ? {
        lat: Math.round(coords.lat * 100) / 100,
        lng: Math.round(coords.lng * 100) / 100,
      }
    : null;
  return useQuery({
    queryKey: [
      ...homeKeys.forYou(isSignedIn ? userId : null),
      ...guestIds,
      near?.lat,
      near?.lng,
      viewed.join(","),
    ],
    queryFn: async () => {
      const context = { coords: near, viewed, seed: await getDeviceId() };
      return isSignedIn
        ? getForYou(context, getToken)
        : getGuestForYou(guestIds, context, getToken);
    },
    enabled: isLoaded && (isSignedIn === true || guestIds.length > 0),
    // Keep showing the last list while a new location/view refetches.
    placeholderData: keepPreviousData,
    select: keepForYouOrder,
  });
}

// Signed in: the account's tastes. Signed out: the picks stored on this device.
export function useTastePreferencesQuery() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  return useQuery({
    queryKey: homeKeys.tastes(userId),
    queryFn: async (): Promise<TasteOption[]> =>
      isSignedIn
        ? getTastePreferences(getToken)
        : (await readGuestTastes()).map((id) => ({ id }) as TasteOption),
    enabled: isLoaded,
  });
}

export function useTasteOptionsQuery() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: homeKeys.tasteOptions(),
    queryFn: () => getTasteOptions(getToken),
    staleTime: 30 * 60 * 1000,
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
      // Saves count toward a badge. Literal key (profileKeys.milestones) —
      // importing features/profile here would create a require cycle.
      void queryClient.invalidateQueries({
        queryKey: ["profile", "milestones"],
      });
    },
  });
}
