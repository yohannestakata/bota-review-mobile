import { apiFetch, type BranchCard, type TokenGetter } from "@/lib/api";

export type CuratedCollectionSection = {
  type: "curated_collection";
  title: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
};

export type HomeBranchSection = {
  type:
    | "meal_time"
    | "nearby"
    | "recently_verified"
    | "highly_rated"
    | "new_to_bota";
  title: string;
  items: BranchCard[];
};

export type HomeSectionData = CuratedCollectionSection | HomeBranchSection;
export type HomeResponse = { sections: HomeSectionData[] };

export function getHome(
  coords: { lat: number; lng: number } | null,
  getToken: TokenGetter,
) {
  const query = coords ? `?lat=${coords.lat}&lng=${coords.lng}` : "";
  return apiFetch<HomeResponse>(`/discovery/home${query}`, getToken);
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
