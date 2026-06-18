import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "@tanstack/react-query";

import { getNeighborhoods } from "@/lib/api";

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
