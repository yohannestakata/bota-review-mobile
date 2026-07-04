import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";

import {
  getAmenities,
  getCuisines,
  getNeighborhoods,
  getTags,
  searchPlaces,
} from "@/lib/api";

import {
  createBranchSubmission,
  reportMissingPlace,
  type BranchSubmissionBody,
  type PlaceMissingDetails,
} from "./api";

type PlaceMissingSubmissionBody = {
  details: PlaceMissingDetails;
  note?: string;
};

export function useNeighborhoods() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["neighborhoods"],
    queryFn: () => getNeighborhoods(getToken),
    staleTime: 30 * 60 * 1000,
  });
}

export function useAmenities() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["amenities"],
    queryFn: () => getAmenities(getToken),
    staleTime: 30 * 60 * 1000,
  });
}

export function useCuisines() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["cuisines"],
    queryFn: () => getCuisines(getToken),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTags() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ["tags"],
    queryFn: () => getTags(getToken),
    staleTime: 30 * 60 * 1000,
  });
}

// Searches existing published places so a "missing place" tip can be matched to
// one that already exists (then it's a new branch, not a duplicate place).
export function useSearchPlaces(query: string) {
  const { getToken } = useAuth();
  const q = query.trim();

  return useQuery({
    queryKey: ["places", "search", q],
    queryFn: () => searchPlaces(q, getToken),
    enabled: q.length >= 2,
    staleTime: 60 * 1000,
  });
}

export function useReportMissingPlace() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: ({ details, note }: PlaceMissingSubmissionBody) =>
      reportMissingPlace(details, getToken, note),
  });
}

export function useCreateBranchSubmission(branchId: string) {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: (body: BranchSubmissionBody) =>
      createBranchSubmission(branchId, body, getToken),
  });
}
