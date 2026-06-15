import { apiFetch, type BranchCard, type TokenGetter } from "@/lib/api";

export type HomeSection = {
  type:
    | "curated_collection"
    | "recently_verified"
    | "highly_rated"
    | "new_to_bota";
  title: string;
  slug?: string;
  description?: string | null;
  coverImageUrl?: string | null;
  items: BranchCard[];
};

export type HomeResponse = { sections: HomeSection[] };

export function getHome(getToken: TokenGetter) {
  return apiFetch<HomeResponse>("/discovery/home", getToken);
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
  return apiFetch<CollectionDetail>(
    `/discovery/collections/${slug}`,
    getToken,
  );
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
