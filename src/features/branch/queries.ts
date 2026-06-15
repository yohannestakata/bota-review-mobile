import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveReview,
  createReview,
  getBranch,
  updateReview,
  type CreateReviewBody,
  type UpdateReviewBody,
} from "./api";

export const branchKeys = {
  all: ["branch"] as const,
  detail: (id: string) => [...branchKeys.all, id] as const,
};

export function useBranch(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => getBranch(id, getToken),
    enabled: Boolean(id),
  });
}

export function useCreateReview(branchId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateReviewBody) =>
      createReview(branchId, body, getToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchKeys.detail(branchId),
      });
    },
  });
}

// branchId travels in the mutation vars so one hook instance serves a list of
// reviews spanning different branches (e.g. the Profile screen).
function invalidateAfterReviewChange(
  queryClient: ReturnType<typeof useQueryClient>,
  branchId: string,
) {
  void queryClient.invalidateQueries({ queryKey: branchKeys.detail(branchId) });
  void queryClient.invalidateQueries({ queryKey: ["profile"] });
}

export function useUpdateReview() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: {
      reviewId: string;
      branchId: string;
      body: UpdateReviewBody;
    }) => updateReview(vars.reviewId, vars.body, getToken),
    onSuccess: (_data, vars) =>
      invalidateAfterReviewChange(queryClient, vars.branchId),
  });
}

export function useDeleteReview() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { reviewId: string; branchId: string }) =>
      archiveReview(vars.reviewId, getToken),
    onSuccess: (_data, vars) =>
      invalidateAfterReviewChange(queryClient, vars.branchId),
  });
}
