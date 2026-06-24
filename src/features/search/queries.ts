import { useAuth } from "@clerk/clerk-expo";
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from "@tanstack/react-query";

import { getNeighborhoods } from "@/lib/api";

import {
  browseBranches,
  getCuisines,
  getTags,
  searchBranches,
  type SearchParams,
} from "./api";

export const searchKeys = {
  all: ["search"] as const,
  cuisines: () => [...searchKeys.all, "cuisines"] as const,
  neighborhoods: () => [...searchKeys.all, "neighborhoods"] as const,
  tags: () => [...searchKeys.all, "tags"] as const,
  browse: () => [...searchKeys.all, "browse"] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, "results", params] as const,
};

const TAXONOMY_STALE = 30 * 60 * 1000;
const PAGE_SIZE = 20;

export function useCuisines() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: searchKeys.cuisines(),
    queryFn: () => getCuisines(getToken),
    staleTime: TAXONOMY_STALE,
  });
}

export function useNeighborhoods() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: searchKeys.neighborhoods(),
    queryFn: () => getNeighborhoods(getToken),
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

export function useSearch(params: SearchParams) {
  const { getToken } = useAuth();
  const hasFilters = Boolean(
    params.neighborhoodId ||
      params.cuisineId?.length ||
      params.tagId?.length ||
      params.priceLevel?.length ||
      params.openNow ||
      (params.sort !== undefined && params.sort !== "rating"),
  );
  const isBrowse = params.q.trim().length < 2 && !hasFilters;

  return useInfiniteQuery({
    queryKey: isBrowse ? searchKeys.browse() : searchKeys.results(params),
    queryFn: ({ pageParam }) =>
      isBrowse
        ? browseBranches(pageParam + 1, PAGE_SIZE, getToken)
        : searchBranches(
            {
              ...params,
              limit: PAGE_SIZE,
              offset: pageParam * PAGE_SIZE,
            },
            getToken,
          ),
    initialPageParam: 0,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PAGE_SIZE ? undefined : pages.length,
    placeholderData: keepPreviousData,
  });
}
