import { useAuth, useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  getMyReplies,
  profileKeys,
  type MyReply,
  type MyReview,
} from "@/features/profile";
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
  reportReviewReply,
  updateOwnerInfo,
  updateReview,
  type BranchDetail,
  type BranchReview,
  type CreateClaimBody,
  type CreateReviewBody,
  type ReviewReply,
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

type ReplyViewer = {
  avatarUrl: string | null;
  displayName: string;
  id: string;
};

function toReviewReply(reply: MyReply, viewer: ReplyViewer): ReviewReply {
  return {
    id: reply.id,
    reviewId: reply.reviewId,
    authorRole: reply.authorRole,
    body: reply.body,
    moderationStatus: reply.moderationStatus,
    createdAt: reply.createdAt,
    updatedAt: reply.updatedAt,
    user: {
      id: viewer.id,
      displayName: viewer.displayName,
      avatarUrl: viewer.avatarUrl,
      trustLevel: "viewer",
    },
  };
}

function mergeOwnRepliesIntoReviews(
  reviews: BranchReview[],
  ownReplies: MyReply[],
  branchId: string,
  viewer: ReplyViewer,
) {
  const visibleOwnReplies = ownReplies.filter(
    (reply) =>
      reply.branchId === branchId &&
      (reply.moderationStatus === "pending" ||
        reply.moderationStatus === "approved"),
  );

  if (visibleOwnReplies.length === 0) return reviews;

  const ownByReview = new Map<string, ReviewReply[]>();
  for (const reply of visibleOwnReplies) {
    const replies = ownByReview.get(reply.reviewId) ?? [];
    replies.push(toReviewReply(reply, viewer));
    ownByReview.set(reply.reviewId, replies);
  }

  return reviews.map((review) => {
    const ownReviewReplies = ownByReview.get(review.id);
    if (!ownReviewReplies?.length) return review;

    const ownReplyIds = new Set(ownReviewReplies.map((reply) => reply.id));
    return {
      ...review,
      replies: [
        ...ownReviewReplies,
        ...(review.replies ?? []).filter(
          (reply) => !ownReplyIds.has(reply.id) && reply.user.id !== viewer.id,
        ),
      ],
    };
  });
}

function mergeOwnRepliesIntoBranch(
  branch: BranchDetail,
  ownReplies: MyReply[],
  viewer: ReplyViewer,
) {
  return {
    ...branch,
    recentReviews: mergeOwnRepliesIntoReviews(
      branch.recentReviews,
      ownReplies,
      branch.id,
      viewer,
    ),
  };
}

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
      void queryClient.invalidateQueries({
        queryKey: branchKeys.menus(branchId),
      });
    },
  });
}

export function useCreateReply(branchId: string) {
  const { getToken, userId } = useAuth();
  const { user } = useUser();
  const queryClient = useQueryClient();

  return useMutation<
    ReviewReply & { moderationStatus: string },
    Error,
    { reviewId: string; body: string },
    {
      optimisticReply: ReviewReply;
      previousDetail?: BranchDetail;
      previousReviews?: BranchReview[];
    }
  >({
    mutationFn: (vars: { reviewId: string; body: string }) =>
      createReviewReply(vars.reviewId, vars.body, getToken),
    onMutate: async (vars) => {
      const detailKey = branchKeys.detail(branchId);
      const reviewsKey = branchKeys.reviews(branchId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: reviewsKey }),
      ]);

      const previousDetail = queryClient.getQueryData<BranchDetail>(detailKey);
      const previousReviews =
        queryClient.getQueryData<BranchReview[]>(reviewsKey);
      const now = new Date().toISOString();
      const optimisticReply: ReviewReply = {
        id: `optimistic:${vars.reviewId}:${Date.now()}`,
        reviewId: vars.reviewId,
        authorRole: "user",
        body: vars.body,
        createdAt: now,
        updatedAt: now,
        user: {
          id: userId ?? "me",
          displayName: user?.fullName ?? user?.firstName ?? "You",
          avatarUrl: user?.imageUrl ?? null,
          trustLevel: "pending",
        },
      };
      const addReply = (review: BranchReview): BranchReview =>
        review.id === vars.reviewId
          ? {
              ...review,
              replies: [
                optimisticReply,
                ...(review.replies ?? []).filter(
                  (reply) => reply.user.id !== optimisticReply.user.id,
                ),
              ],
            }
          : review;

      queryClient.setQueryData<BranchDetail>(detailKey, (current) =>
        current
          ? { ...current, recentReviews: current.recentReviews.map(addReply) }
          : current,
      );
      queryClient.setQueryData<BranchReview[]>(reviewsKey, (current) =>
        current?.map(addReply),
      );

      return { optimisticReply, previousDetail, previousReviews };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          branchKeys.detail(branchId),
          context.previousDetail,
        );
      }
      if (context?.previousReviews) {
        queryClient.setQueryData(
          branchKeys.reviews(branchId),
          context.previousReviews,
        );
      }
    },
    onSuccess: (reply, _vars, context) => {
      if (!context) return;

      const replaceReply = (review: BranchReview): BranchReview => ({
        ...review,
        replies: (review.replies ?? []).map((current) =>
          current.id === context.optimisticReply.id ? reply : current,
        ),
      });

      queryClient.setQueryData<BranchDetail>(
        branchKeys.detail(branchId),
        (current) =>
          current
            ? {
                ...current,
                recentReviews: current.recentReviews.map(replaceReply),
              }
            : current,
      );
      queryClient.setQueryData<BranchReview[]>(
        branchKeys.reviews(branchId),
        (current) => current?.map(replaceReply),
      );

      void queryClient.invalidateQueries({
        queryKey: profileKeys.replies(userId),
      });
      if (reply.moderationStatus === "approved") {
        // Refresh both the branch detail (recentReviews) and the all-reviews list.
        void queryClient.invalidateQueries({
          queryKey: branchKeys.detail(branchId),
        });
        void queryClient.invalidateQueries({
          queryKey: branchKeys.reviews(branchId),
        });
      }
    },
  });
}

export function useReportReply() {
  const { getToken } = useAuth();

  return useMutation({
    mutationFn: (vars: { replyId: string; reason?: string }) =>
      reportReviewReply(vars.replyId, vars.reason, getToken),
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
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const ownReplies = useQuery({
    queryKey: profileKeys.replies(userId),
    queryFn: () => getMyReplies(getToken),
    enabled: isSignedIn === true && Boolean(id),
  });
  const viewer: ReplyViewer = {
    id: userId ?? "me",
    displayName: user?.fullName ?? user?.firstName ?? "You",
    avatarUrl: user?.imageUrl ?? null,
  };

  const reviews = useQuery({
    queryKey: branchKeys.reviews(id),
    queryFn: () => getBranchReviews(id, getToken),
    enabled: Boolean(id),
  });

  return {
    ...reviews,
    data: reviews.data
      ? mergeOwnRepliesIntoReviews(
          reviews.data,
          ownReplies.data ?? [],
          id,
          viewer,
        )
      : reviews.data,
  };
}

export function useBranch(id: string) {
  const { getToken, isSignedIn, userId } = useAuth();
  const { user } = useUser();
  const ownReplies = useQuery({
    queryKey: profileKeys.replies(userId),
    queryFn: () => getMyReplies(getToken),
    enabled: isSignedIn === true && Boolean(id),
  });
  const viewer: ReplyViewer = {
    id: userId ?? "me",
    displayName: user?.fullName ?? user?.firstName ?? "You",
    avatarUrl: user?.imageUrl ?? null,
  };

  const branch = useQuery({
    queryKey: branchKeys.detail(id),
    queryFn: () => getBranch(id, getToken),
    enabled: Boolean(id),
  });

  return {
    ...branch,
    data: branch.data
      ? mergeOwnRepliesIntoBranch(branch.data, ownReplies.data ?? [], viewer)
      : branch.data,
  };
}

export function useBranchSiblings(
  id: string,
  coords?: { lat?: number; lng?: number },
) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: [
      ...branchKeys.siblings(id),
      coords?.lat ?? null,
      coords?.lng ?? null,
    ],
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
    mutationFn: (body: CreateClaimBody) =>
      createClaim(branchId, body, getToken),
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
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    BranchReview,
    Error,
    { reviewId: string; branchId: string; body: UpdateReviewBody },
    {
      previousDetail?: BranchDetail;
      previousMyReviews?: MyReview[];
      previousReviews?: BranchReview[];
    }
  >({
    mutationFn: (vars: {
      reviewId: string;
      branchId: string;
      body: UpdateReviewBody;
    }) => updateReview(vars.reviewId, vars.body, getToken),
    onMutate: async (vars) => {
      const detailKey = branchKeys.detail(vars.branchId);
      const reviewsKey = branchKeys.reviews(vars.branchId);
      const myReviewsKey = profileKeys.reviews(userId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: reviewsKey }),
        queryClient.cancelQueries({ queryKey: myReviewsKey }),
      ]);

      const previousDetail = queryClient.getQueryData<BranchDetail>(detailKey);
      const previousReviews =
        queryClient.getQueryData<BranchReview[]>(reviewsKey);
      const previousMyReviews =
        queryClient.getQueryData<MyReview[]>(myReviewsKey);

      queryClient.setQueryData<BranchDetail>(detailKey, (current) =>
        current
          ? {
              ...current,
              recentReviews: current.recentReviews.filter(
                (review) => review.id !== vars.reviewId,
              ),
            }
          : current,
      );
      queryClient.setQueryData<BranchReview[]>(reviewsKey, (current) =>
        current?.filter((review) => review.id !== vars.reviewId),
      );
      queryClient.setQueryData<MyReview[]>(myReviewsKey, (current) =>
        current?.map((review) =>
          review.id === vars.reviewId
            ? {
                ...review,
                rating: vars.body.rating ?? review.rating,
                text: vars.body.text ?? review.text,
                moderationStatus: "pending",
              }
            : review,
        ),
      );

      return { previousDetail, previousReviews, previousMyReviews };
    },
    onError: (_error, vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          branchKeys.detail(vars.branchId),
          context.previousDetail,
        );
      }
      if (context?.previousReviews) {
        queryClient.setQueryData(
          branchKeys.reviews(vars.branchId),
          context.previousReviews,
        );
      }
      if (context?.previousMyReviews) {
        queryClient.setQueryData(
          profileKeys.reviews(userId),
          context.previousMyReviews,
        );
      }
    },
    onSettled: (_data, _error, vars) =>
      invalidateAfterReviewChange(queryClient, vars.branchId),
  });
}

export function useDeleteReview() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation<
    void,
    Error,
    { reviewId: string; branchId: string },
    {
      previousDetail?: BranchDetail;
      previousMyReviews?: MyReview[];
      previousReviews?: BranchReview[];
    }
  >({
    mutationFn: (vars: { reviewId: string; branchId: string }) =>
      archiveReview(vars.reviewId, getToken),
    onMutate: async (vars) => {
      const detailKey = branchKeys.detail(vars.branchId);
      const reviewsKey = branchKeys.reviews(vars.branchId);
      const myReviewsKey = profileKeys.reviews(userId);

      await Promise.all([
        queryClient.cancelQueries({ queryKey: detailKey }),
        queryClient.cancelQueries({ queryKey: reviewsKey }),
        queryClient.cancelQueries({ queryKey: myReviewsKey }),
      ]);

      const previousDetail = queryClient.getQueryData<BranchDetail>(detailKey);
      const previousReviews =
        queryClient.getQueryData<BranchReview[]>(reviewsKey);
      const previousMyReviews =
        queryClient.getQueryData<MyReview[]>(myReviewsKey);

      queryClient.setQueryData<BranchDetail>(detailKey, (current) =>
        current
          ? {
              ...current,
              recentReviews: current.recentReviews.filter(
                (review) => review.id !== vars.reviewId,
              ),
            }
          : current,
      );
      queryClient.setQueryData<BranchReview[]>(reviewsKey, (current) =>
        current?.filter((review) => review.id !== vars.reviewId),
      );
      queryClient.setQueryData<MyReview[]>(myReviewsKey, (current) =>
        current?.filter((review) => review.id !== vars.reviewId),
      );

      return { previousDetail, previousReviews, previousMyReviews };
    },
    onError: (_error, vars, context) => {
      if (context?.previousDetail) {
        queryClient.setQueryData(
          branchKeys.detail(vars.branchId),
          context.previousDetail,
        );
      }
      if (context?.previousReviews) {
        queryClient.setQueryData(
          branchKeys.reviews(vars.branchId),
          context.previousReviews,
        );
      }
      if (context?.previousMyReviews) {
        queryClient.setQueryData(
          profileKeys.reviews(userId),
          context.previousMyReviews,
        );
      }
    },
    onSettled: (_data, _error, vars) =>
      invalidateAfterReviewChange(queryClient, vars.branchId),
  });
}
