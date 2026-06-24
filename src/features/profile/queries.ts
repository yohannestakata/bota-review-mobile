import { useAuth } from "@clerk/clerk-expo";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "@/lib/api";

import { getMyReviews, getPublicProfile, getPublicReviews } from "./api";

const PUBLIC_REVIEWS_PAGE_SIZE = 20;

export const profileKeys = {
  all: ["profile"] as const,
  me: (userId: string | null | undefined) =>
    [...profileKeys.all, "me", userId ?? "anonymous"] as const,
  reviews: (userId: string | null | undefined) =>
    [...profileKeys.all, "reviews", userId ?? "anonymous"] as const,
  publicProfile: (id: string) =>
    [...profileKeys.all, "public", id] as const,
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
      getPublicReviews(
        id,
        pageParam,
        PUBLIC_REVIEWS_PAGE_SIZE,
        getToken,
      ),
    enabled: Boolean(id),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) =>
      lastPage.length < PUBLIC_REVIEWS_PAGE_SIZE
        ? undefined
        : pages.length + 1,
  });
}
