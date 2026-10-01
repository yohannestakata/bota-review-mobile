import { useAuth } from "@clerk/clerk-expo";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import {
  browseBranches,
  getCardsByIds,
  getMapPoints,
  searchBranches,
  type MapFilters,
  type SearchParams,
} from "./api";

export const searchKeys = {
  all: ["search"] as const,
  browse: () => [...searchKeys.all, "browse"] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, "results", params] as const,
};

export type MapViewport = {
  bbox: [number, number, number, number];
  zoom: number;
};

/** Pins and clusters for what the map shows; the previous set stays up
 * while the next loads, so pins don't blink out on every pan. */
export function useMapPoints(filters: MapFilters, viewport: MapViewport | null) {
  const { getToken } = useAuth();
  // Rounded so tiny camera jitters reuse the same request.
  const bbox = viewport?.bbox.map((n) => Math.round(n * 1e4) / 1e4) as
    | [number, number, number, number]
    | undefined;
  const zoom = viewport ? Math.round(viewport.zoom) : 0;
  return useQuery({
    queryKey: [...searchKeys.all, "map", filters, bbox, zoom] as const,
    queryFn: () => getMapPoints(filters, bbox!, zoom, getToken),
    enabled: Boolean(bbox),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

/** Full cards for the places in the map's carousel. */
export function useMapCards(ids: string[]) {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: [...searchKeys.all, "cards", ids] as const,
    queryFn: () => getCardsByIds(ids, getToken),
    enabled: ids.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

const PAGE_SIZE = 20;

export function useSearch(params: SearchParams) {
  const { getToken } = useAuth();
  const hasFilters = Boolean(
    params.neighborhoodId ||
    params.cuisineId?.length ||
    params.tagId?.length ||
    params.openNow ||
    (params.sort !== undefined && params.sort !== "rating"),
  );
  const isBrowse = params.q.trim().length < 2 && !hasFilters;
  const pageSize = PAGE_SIZE;

  return useInfiniteQuery({
    queryKey: isBrowse ? searchKeys.browse() : searchKeys.results(params),
    queryFn: ({ pageParam }) =>
      isBrowse
        ? browseBranches(pageParam + 1, PAGE_SIZE, getToken)
        : searchBranches(
            {
              ...params,
              limit: pageSize,
              offset: pageParam * pageSize,
            },
            getToken,
          ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < pageSize ? undefined : pages.length,
    placeholderData: keepPreviousData,
  });
}
