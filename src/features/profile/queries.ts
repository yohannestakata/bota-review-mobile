import { useAuth } from "@clerk/clerk-expo";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  deleteReviewReply,
  updateReviewReply,
  type ReviewReply,
} from "@/features/branch/api";
import { getCurrentUser } from "@/lib/api";

import {
  getMyReplies,
  getMyReviews,
  getPublicProfile,
  getPublicReviews,
  type MyReply,
} from "./api";

const PUBLIC_REVIEWS_PAGE_SIZE = 20;

export const profileKeys = {
  all: ["profile"] as const,
  me: (userId: string | null | undefined) =>
    [...profileKeys.all, "me", userId ?? "anonymous"] as const,
  reviews: (userId: string | null | undefined) =>
    [...profileKeys.all, "reviews", userId ?? "anonymous"] as const,
  replies: (userId: string | null | undefined) =>
    [...profileKeys.all, "replies", userId ?? "anonymous"] as const,
  publicProfile: (id: string) => [...profileKeys.all, "public", id] as const,
  publicReviews: (id: string) =>
    [...profileKeys.publicProfile(id), "reviews"] as const,
};

export function useMe() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: profileKeys.me(userId),
    queryFn: () => getCurrentUser(getToken),
    enabled: isSignedIn === true,
  });
}

export function useMyReviews() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: profileKeys.reviews(userId),
    queryFn: () => getMyReviews(getToken),
    enabled: isSignedIn === true,
  });
}

export function useMyReplies() {
  const { getToken, isSignedIn, userId } = useAuth();

  return useQuery({
    queryKey: profileKeys.replies(userId),
    queryFn: () => getMyReplies(getToken),
    enabled: isSignedIn === true,
  });
}

export function useUpdateMyReply() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const repliesKey = profileKeys.replies(userId);

  return useMutation<
    ReviewReply & { moderationStatus: string },
    Error,
    { replyId: string; body: string },
    { previousReplies?: MyReply[] }
  >({
    mutationFn: (vars: { replyId: string; body: string }) =>
      updateReviewReply(vars.replyId, vars.body, getToken),
    onMutate: async (vars) => {
      await queryClient.cancelQueries({ queryKey: repliesKey });
      const previousReplies = queryClient.getQueryData<MyReply[]>(repliesKey);

      queryClient.setQueryData<MyReply[]>(repliesKey, (current) =>
        current?.map((reply) =>
          reply.id === vars.replyId
            ? { ...reply, body: vars.body, moderationStatus: "pending" }
            : reply,
        ),
      );

      return { previousReplies };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousReplies) {
        queryClient.setQueryData(repliesKey, context.previousReplies);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: repliesKey,
      });
      // Reflect the edit on any branch detail / all-reviews list too.
      void queryClient.invalidateQueries({ queryKey: ["branch"] });
    },
  });
}

export function useDeleteMyReply() {
  const { getToken, userId } = useAuth();
  const queryClient = useQueryClient();
  const repliesKey = profileKeys.replies(userId);

  return useMutation<
    { success: boolean },
    Error,
    string,
    { previousReplies?: MyReply[] }
  >({
    mutationFn: (replyId: string) => deleteReviewReply(replyId, getToken),
    onMutate: async (replyId) => {
      await queryClient.cancelQueries({ queryKey: repliesKey });
      const previousReplies = queryClient.getQueryData<MyReply[]>(repliesKey);

      queryClient.setQueryData<MyReply[]>(repliesKey, (current) =>
        current?.filter((reply) => reply.id !== replyId),
      );

      return { previousReplies };
    },
    onError: (_error, _vars, context) => {
      if (context?.previousReplies) {
        queryClient.setQueryData(repliesKey, context.previousReplies);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: repliesKey,
      });
      void queryClient.invalidateQueries({ queryKey: ["branch"] });
    },
  });
}

export function usePublicProfile(id: string) {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: profileKeys.publicProfile(id),
    queryFn: () => getPublicProfile(id, getToken),
    enabled: Boolean(id),
  });
}

export function usePublicReviews(id: string) {
  const { getToken } = useAuth();

  return useInfiniteQuery({
    queryKey: profileKeys.publicReviews(id),
    queryFn: ({ pageParam }) =>
      getPublicReviews(id, pageParam, PUBLIC_REVIEWS_PAGE_SIZE, getToken),
    enabled: Boolean(id),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PUBLIC_REVIEWS_PAGE_SIZE ? undefined : pages.length + 1,
  });
}
