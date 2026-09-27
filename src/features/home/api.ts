import {
  apiFetch,
  type BranchCard,
  type Cuisine,
  type TokenGetter,
} from "@/lib/api";

export type CuratedCollectionSection = {
  type: "curated_collection";
  title: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
};

export type HomeBranchSection = {
  type: "meal_time" | "nearby" | "highly_rated" | "for_you";
  title: string;
  description?: string;
  items: BranchCard[];
};

export type HomeSectionData = CuratedCollectionSection | HomeBranchSection;
export type HomeResponse = { sections: HomeSectionData[] };
export type TasteOption = {
  id: string;
  name: string;
  slug: string;
  group: "food" | "mood" | "time";
};

export function getHome(
  coords: { lat: number; lng: number } | null,
  getToken: TokenGetter,
) {
  const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  return apiFetch<HomeResponse>(`/discovery/home${query}`, getToken);
}

/** What the app tells "For you" about right now, to rank for it. */
export type ForYouContext = {
  coords?: { lat: number; lng: number } | null;
  /** Recently viewed place ids, most recent first. */
  viewed?: string[];
  /** Stable per-install id (guest rotation). */
  seed?: string;
};

function contextQuery(context: ForYouContext) {
  const query = new URLSearchParams();
  if (context.coords) {
    query.set("lat", String(context.coords.lat));
    query.set("lng", String(context.coords.lng));
  }
  context.viewed?.forEach((id) => query.append("viewed", id));
  if (context.seed) query.set("seed", context.seed);
  return query;
}

export function getForYou(context: ForYouContext, getToken: TokenGetter) {
  return apiFetch<HomeBranchSection>(
    `/discovery/for-you?${contextQuery(context).toString()}`,
    getToken,
  );
}

// "For you" for someone signed out, from the tastes picked on their device.
export function getGuestForYou(
  tasteOptionIds: string[],
  context: ForYouContext,
  getToken: TokenGetter,
) {
  const query = contextQuery(context);
  tasteOptionIds.forEach((id) => query.append("tasteOptionId", id));
  return apiFetch<HomeBranchSection>(
    `/discovery/for-you/guest?${query.toString()}`,
    getToken,
  );
}

export function getTastePreferences(getToken: TokenGetter) {
  return apiFetch<TasteOption[]>("/me/taste-preferences", getToken);
}

export function replaceTastePreferences(
  tasteOptionIds: string[],
  getToken: TokenGetter,
) {
  return apiFetch<TasteOption[]>("/me/taste-preferences", getToken, {
    method: "PUT",
    body: JSON.stringify({ tasteOptionIds }),
  });
}

export function getTasteOptions(getToken: TokenGetter) {
  // Public, so guests can pick tastes too.
  return apiFetch<TasteOption[]>("/discovery/taste-options", getToken);
}

export type CollectionDetail = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverImageUrl: string | null;
  branches: BranchCard[];
};

export function getCollection(slug: string, getToken: TokenGetter) {
  return apiFetch<CollectionDetail>(`/discovery/collections/${slug}`, getToken);
}

export type PlaceDetail = {
  id: string;
  slug: string;
  type: string;
  status: string;
  name: string;
  description: string | null;
  branchCount: number;
  branches: BranchCard[];
  cuisines: Cuisine[];
};

export function getPlace(id: string, getToken: TokenGetter) {
  return apiFetch<PlaceDetail>(`/places/${id}`, getToken);
}

export function getSavedBranchIds(getToken: TokenGetter) {
  return apiFetch<{ branchIds: string[] }>("/me/saves/ids", getToken);
}

export function getSaves(getToken: TokenGetter) {
  return apiFetch<BranchCard[]>("/me/saves", getToken);
}

export function saveBranch(branchId: string, getToken: TokenGetter) {
  return apiFetch<{ branchId: string; saved: true; savedAt: string }>(
    `/branches/${branchId}/saves`,
    getToken,
    { method: "POST" },
  );
}

export function unsaveBranch(branchId: string, getToken: TokenGetter) {
  return apiFetch<void>(`/branches/${branchId}/saves`, getToken, {
    method: "DELETE",
  });
}
