import { useAuth } from "@clerk/clerk-expo";
import { keepPreviousData, useInfiniteQuery } from "@tanstack/react-query";

import { browseBranches, searchBranches, type SearchParams } from "./api";

export const searchKeys = {
  all: ["search"] as const,
  browse: () => [...searchKeys.all, "browse"] as const,
  results: (params: SearchParams) =>
    [...searchKeys.all, "results", params] as const,
};

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
