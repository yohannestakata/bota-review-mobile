import { apiFetch, type TokenGetter } from "@/lib/api";

export type MyReview = {
  id: string;
  branchId: string;
  rating: number;
  text: string;
  moderationStatus: "pending" | "approved" | "rejected" | "archived";
  createdAt: string;
  branch: {
    id: string;
    label: string | null;
    slug: string;
    status: string;
  };
};

export function getMyReviews(getToken: TokenGetter) {
  return apiFetch<MyReview[]>("/me/reviews", getToken);
}

export type PublicProfile = {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  reviewCount: number;
  joinedAt: string;
};

export type PublicReview = {
  id: string;
  branchId: string;
  rating: number;
  text: string;
  visitDate: string | null;
  createdAt: string;
  branch: {
    id: string;
    label: string | null;
    slug: string;
    status: string;
    placeName: string;
  };
  photos: {
    id: string;
    url: string;
    width: number;
    height: number;
  }[];
};

export function getPublicProfile(id: string, getToken: TokenGetter) {
  return apiFetch<PublicProfile>(`/users/${id}/profile`, getToken);
}

export function getPublicReviews(
  id: string,
  page: number,
  limit: number,
  getToken: TokenGetter,
) {
  return apiFetch<PublicReview[]>(
    `/users/${id}/reviews?page=${page}&limit=${limit}`,
    getToken,
  );
}
