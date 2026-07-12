import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { getAmenities, getCuisines, getNeighborhoods, getTags } from "@/lib/api";

// Shared taxonomy (cuisines, neighborhoods, tags, amenities). Used by search,
// submissions, manage-listing and home — one module, one set of cache keys, so
// the same data isn't fetched and cached twice.
const STALE_TIME = 30 * 60 * 1000;

export const taxonomyKeys = {
  all: ["taxonomy"] as const,
  cuisines: () => [...taxonomyKeys.all, "cuisines"] as const,
  neighborhoods: () => [...taxonomyKeys.all, "neighborhoods"] as const,
  tags: () => [...taxonomyKeys.all, "tags"] as const,
  amenities: () => [...taxonomyKeys.all, "amenities"] as const,
};

export function useCuisines() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.cuisines(),
    queryFn: () => getCuisines(getToken),
    staleTime: STALE_TIME,
  });
}

export function useNeighborhoods() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.neighborhoods(),
    queryFn: () => getNeighborhoods(getToken),
    staleTime: STALE_TIME,
  });
}

export function useTags() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.tags(),
    queryFn: () => getTags(getToken),
    staleTime: STALE_TIME,
  });
}

export function useAmenities() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.amenities(),
    queryFn: () => getAmenities(getToken),
    staleTime: STALE_TIME,
  });
}
