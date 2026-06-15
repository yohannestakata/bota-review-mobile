import { useAuth } from "@clerk/clerk-expo";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { getCuisines, getTags, searchBranches, type SearchParams } from "./api";

export const searchKeys = {
  all: ["search"] as const,
  cuisines: () => [...searchKeys.all, "cuisines"] as const,
  tags: () => [...searchKeys.all, "tags"] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, "results", params] as const,
};

const TAXONOMY_STALE = 30 * 60 * 1000;

export function useCuisines() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: searchKeys.cuisines(),
    queryFn: () => getCuisines(getToken),
    staleTime: TAXONOMY_STALE,
  });
}

export function useTags() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: searchKeys.tags(),
    queryFn: () => getTags(getToken),
    staleTime: TAXONOMY_STALE,
  });
}

const MIN_QUERY_LENGTH = 2;

export function hasActiveFilters(params: SearchParams): boolean {
  return Boolean(
    params.cuisineId?.length ||
      params.tagId?.length ||
      params.priceLevel?.length ||
      params.openNow,
  );
}

export function useNearby(coords: { lat: number; lng: number } | null) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [...searchKeys.all, "nearby", coords?.lat, coords?.lng],
    queryFn: () =>
      searchBranches(
        {
          q: "",
          lat: coords?.lat,
          lng: coords?.lng,
          sort: "distance",
          limit: 10,
        },
        getToken,
      ),
    enabled: Boolean(coords),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearch(params: SearchParams) {
  const { getToken } = useAuth();
  const enabled =
    params.q.trim().length >= MIN_QUERY_LENGTH || hasActiveFilters(params);

  return useQuery({
    queryKey: searchKeys.results(params),
    queryFn: () => searchBranches(params, getToken),
    enabled,
    placeholderData: keepPreviousData,
  });
}
