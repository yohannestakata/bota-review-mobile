import { apiFetch, type BranchCard, type TokenGetter } from "@/lib/api";

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
  openNow?: boolean;
  lat?: number;
  lng?: number;
  sort?: SearchSort;
  limit?: number;
  offset?: number;
};

/** The filters the map shares with search (no paging or sort). */
export type MapFilters = Pick<
  SearchParams,
  "q" | "neighborhoodId" | "cuisineId" | "tagId" | "openNow"
>;

function filterQuery(params: MapFilters) {
  const query = new URLSearchParams();
  query.set("q", params.q);
  if (params.neighborhoodId) {
    query.set("neighborhoodId", params.neighborhoodId);
  }
  params.cuisineId?.forEach((id) => query.append("cuisineId", id));
  params.tagId?.forEach((id) => query.append("tagId", id));
  if (params.openNow) {
    query.set("openNow", "true");
  }
  return query;
}

export type MapPin = {
  id: string;
  lat: number;
  lng: number;
  rating: string;
  reviewCount: number;
  name: string;
};
export type MapCluster = { lat: number; lng: number; count: number };
export type MapPoints = {
  total: number;
  pins: MapPin[];
  clusters: MapCluster[];
};

/** Every matching place in a viewport, as pins or clusters. */
export function getMapPoints(
  filters: MapFilters,
  bbox: [number, number, number, number],
  zoom: number,
  getToken: TokenGetter,
) {
  const query = filterQuery(filters);
  query.set("bbox", bbox.map((n) => n.toFixed(5)).join(","));
  query.set("zoom", String(zoom));
  return apiFetch<MapPoints>(`/search/map?${query.toString()}`, getToken);
}

/** Full cards for places picked on the map, in the order given. */
export function getCardsByIds(ids: string[], getToken: TokenGetter) {
  const query = new URLSearchParams();
  query.set("ids", ids.join(","));
  return apiFetch<BranchCard[]>(`/search/cards?${query.toString()}`, getToken);
}

export function searchBranches(params: SearchParams, getToken: TokenGetter) {
  const query = filterQuery(params);
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
