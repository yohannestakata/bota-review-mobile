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
