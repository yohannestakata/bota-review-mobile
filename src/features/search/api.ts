import {
  apiFetch,
  type BranchCard,
  type Cuisine,
  type Tag,
  type TokenGetter,
} from "@/lib/api";

export type SearchSort =
  | "rating"
  | "review_count"
  | "recently_verified"
  | "newest"
  | "distance";

export type SearchParams = {
  q: string;
  neighborhoodId?: string;
  cuisineId?: string[];
  tagId?: string[];
  priceLevel?: number[];
  openNow?: boolean;
  lat?: number;
  lng?: number;
  sort?: SearchSort;
  limit?: number;
  offset?: number;
};

export function searchBranches(params: SearchParams, getToken: TokenGetter) {
  const query = new URLSearchParams();
  query.set("q", params.q);
  if (params.neighborhoodId) {
    query.set("neighborhoodId", params.neighborhoodId);
  }
  params.cuisineId?.forEach((id) => query.append("cuisineId", id));
  params.tagId?.forEach((id) => query.append("tagId", id));
  params.priceLevel?.forEach((level) =>
    query.append("priceLevel", String(level)),
  );
  if (params.openNow) {
    query.set("openNow", "true");
  }
  if (params.lat !== undefined && params.lng !== undefined) {
    query.set("lat", String(params.lat));
    query.set("lng", String(params.lng));
  }
  if (params.sort) {
    query.set("sort", params.sort);
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  return apiFetch<BranchCard[]>(`/search?${query.toString()}`, getToken);
}

export function browseBranches(
  page: number,
  limit: number,
  getToken: TokenGetter,
) {
  return apiFetch<BranchCard[]>(
    `/branches?page=${page}&limit=${limit}`,
    getToken,
  );
}

export function getCuisines(getToken: TokenGetter) {
  return apiFetch<Cuisine[]>("/cuisines", getToken);
}

export function getTags(getToken: TokenGetter) {
  return apiFetch<Tag[]>("/tags", getToken);
}
