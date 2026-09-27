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
/** Map-area searches fetch more at once (the server's max): a map shows a
 * whole area, not a scrolling list. */
export const AREA_PAGE_SIZE = 50;

export function useSearch(params: SearchParams) {
  const { getToken } = useAuth();
  const hasFilters = Boolean(
    params.neighborhoodId ||
    params.cuisineId?.length ||
    params.tagId?.length ||
    params.openNow ||
    params.bbox ||
    (params.sort !== undefined && params.sort !== "rating"),
  );
  const isBrowse = params.q.trim().length < 2 && !hasFilters;
  const pageSize = params.bbox ? AREA_PAGE_SIZE : PAGE_SIZE;

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
