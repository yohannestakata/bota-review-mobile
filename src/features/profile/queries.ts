import { useAuth } from "@clerk/clerk-expo";
import { useQuery } from "@tanstack/react-query";

import { getCurrentUser } from "@/lib/api";

import { getMyReviews } from "./api";

export const profileKeys = {
  all: ["profile"] as const,
  me: () => [...profileKeys.all, "me"] as const,
  reviews: () => [...profileKeys.all, "reviews"] as const,
};

export function useMe() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: profileKeys.me(),
    queryFn: () => getCurrentUser(getToken),
  });
}

export function useMyReviews() {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: profileKeys.reviews(),
    queryFn: () => getMyReviews(getToken),
  });
}
