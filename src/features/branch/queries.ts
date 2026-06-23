import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveReview,
  createClaim,
  createReview,
  getBranch,
  getBranchMenus,
  getBranchSiblings,
  updateReview,
  type CreateClaimBody,
  type CreateReviewBody,
  type UpdateReviewBody,
} from "./api";

export const branchKeys = {
  all: ["branch"] as const,
  detail: (id: string) => [...branchKeys.all, id] as const,
  siblings: (id: string) => [...branchKeys.detail(id), "siblings"] as const,
  menus: (id: string) => [...branchKeys.detail(id), "menus"] as const,
};

export function useBranch(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => getBranch(id, getToken),
    enabled: Boolean(id),
  });
}

export function useBranchSiblings(
  id: string,
  coords?: { lat?: number; lng?: number },
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [...branchKeys.siblings(id), coords?.lat ?? null, coords?.lng ?? null],
    queryFn: () => getBranchSiblings(id, coords, getToken),
    enabled: Boolean(id),
  });
}

export function useBranchMenus(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: branchKeys.menus(id),
    queryFn: () => getBranchMenus(id, getToken),
    enabled: Boolean(id),
  });
}

export function useCreateClaim(branchId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CreateClaimBody) => createClaim(branchId, body, getToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchKeys.detail(branchId),
      });
    },
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
