import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import {
  getAmenities,
  getCuisines,
  getFoodCategories,
  getNeighborhoods,
  getPhotoCategories,
  getTagGroups,
  getTags,
  type LookupItem,
} from "@/lib/api";

// Shared taxonomy (cuisines, neighborhoods, tags, amenities). Used by search,
// submissions, manage-listing and home — one module, one set of cache keys, so
// the same data isn't fetched and cached twice.
const STALE_TIME = 30 * 60 * 1000;

export const taxonomyKeys = {
  all: ["taxonomy"] as const,
  cuisines: () => [...taxonomyKeys.all, "cuisines"] as const,
  foodCategories: () => [...taxonomyKeys.all, "food-categories"] as const,
  neighborhoods: () => [...taxonomyKeys.all, "neighborhoods"] as const,
  tags: () => [...taxonomyKeys.all, "tags"] as const,
  amenities: () => [...taxonomyKeys.all, "amenities"] as const,
  tagGroups: () => [...taxonomyKeys.all, "tag-groups"] as const,
  photoCategories: () => [...taxonomyKeys.all, "photo-categories"] as const,
};

// What the lists started as. Shown until the live lists load (or when
// offline), so filters and pickers are never empty.
const DEFAULT_TAG_GROUPS: LookupItem[] = [
  { key: "vibe", name: "Vibe", displayOrder: 0 },
  { key: "diet", name: "Dietary", displayOrder: 1 },
  { key: "time", name: "Good for", displayOrder: 2 },
  { key: "practical", name: "Features", displayOrder: 3 },
];

export const DEFAULT_PHOTO_CATEGORIES: LookupItem[] = [
  { key: "food", name: "Food", displayOrder: 0 },
  { key: "drink", name: "Drink", displayOrder: 1 },
  { key: "interior", name: "Inside", displayOrder: 2 },
  { key: "exterior", name: "Outside", displayOrder: 3 },
  { key: "menu", name: "Menu", displayOrder: 4 },
  { key: "ambience", name: "Vibe", displayOrder: 5 },
];

export function useCuisines() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.cuisines(),
    queryFn: () => getCuisines(getToken),
    staleTime: STALE_TIME,
  });
}

export function useFoodCategories() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.foodCategories(),
    queryFn: () => getFoodCategories(getToken),
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

/** Groups for the search filter's tag sections, in the admin's order. */
export function useTagGroups() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.tagGroups(),
    queryFn: () => getTagGroups(getToken),
    staleTime: STALE_TIME,
    placeholderData: DEFAULT_TAG_GROUPS,
  });
}

/** What a photo can be labelled as, in the admin's order. */
export function usePhotoCategories() {
  const { getToken } = useAuth();
  return useQuery({
    queryKey: taxonomyKeys.photoCategories(),
    queryFn: () => getPhotoCategories(getToken),
    staleTime: STALE_TIME,
    placeholderData: DEFAULT_PHOTO_CATEGORIES,
  });
}
