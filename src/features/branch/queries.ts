import { useAuth } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  archiveReview,
  createClaim,
  createReview,
  createReviewReply,
  getBranch,
  getBranchMenus,
  getBranchReviews,
  getBranchSiblings,
  getMyClaims,
  getReview,
  reportReview,
  updateOwnerInfo,
  updateReview,
  type CreateClaimBody,
  type CreateReviewBody,
  type UpdateOwnerInfoBody,
  type UpdateReviewBody,
} from "./api";

export const branchKeys = {
  all: ["branch"] as const,
  detail: (id: string) => [...branchKeys.all, id] as const,
  siblings: (id: string) => [...branchKeys.detail(id), "siblings"] as const,
  menus: (id: string) => [...branchKeys.detail(id), "menus"] as const,
  reviews: (id: string) => [...branchKeys.detail(id), "reviews"] as const,
  review: (id: string) => [...branchKeys.all, "review", id] as const,
};

export const claimKeys = {
  all: ["claims"] as const,
  mine: () => [...claimKeys.all, "mine"] as const,
};

export function useReview(reviewId: string | undefined) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: branchKeys.review(reviewId ?? ""),
    queryFn: () => getReview(reviewId as string, getToken),
    enabled: Boolean(reviewId),
  });
}

export function useOwnClaims() {
  const { getToken, isSignedIn } = useAuth();

  return useQuery({
    queryKey: claimKeys.mine(),
    queryFn: () => getMyClaims(getToken),
    enabled: !!isSignedIn,
  });
}

export function useUpdateOwnerInfo(branchId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpdateOwnerInfoBody) =>
      updateOwnerInfo(branchId, body, getToken),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: branchKeys.detail(branchId),
      });
    },
  });
}

export function useCreateReply(branchId: string) {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (vars: { reviewId: string; body: string }) =>
      createReviewReply(vars.reviewId, vars.body, getToken),
    onSuccess: () => {
      // Refresh both the branch detail (recentReviews) and the all-reviews list.
      void queryClient.invalidateQueries({
        queryKey: branchKeys.detail(branchId),
      });
      void queryClient.invalidateQueries({
        queryKey: branchKeys.reviews(branchId),
      });
    },
  });
}

export function useReportReview() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: (vars: { reviewId: string; reason?: string }) =>
      reportReview(vars.reviewId, vars.reason, getToken),
  });
}

export function useBranchReviews(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: branchKeys.reviews(id),
    queryFn: () => getBranchReviews(id, getToken),
    enabled: Boolean(id),
  });
}

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
      void queryClient.invalidateQueries({ queryKey: claimKeys.mine() });
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
