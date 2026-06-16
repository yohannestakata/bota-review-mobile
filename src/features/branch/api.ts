import {
  apiFetch,
  type BranchCard,
  type Cuisine,
  type Neighborhood,
  type Tag,
  type TokenGetter,
} from "@/lib/api";

export type BranchPhoto = {
  id: string;
  url: string;
  width: number;
  height: number;
  category: string;
  isCover: boolean;
  createdAt: string;
};

export type BranchReview = {
  id: string;
  rating: number;
  text: string;
  visitDate: string | null;
  createdAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    trustLevel: string;
  };
};

export type BranchHours = Record<string, [string, string][]>;

export type BranchDetail = {
  id: string;
  placeId: string;
  slug: string;
  label: string | null;
  addressText: string | null;
  latitude: string | null;
  longitude: string | null;
  phone: string | null;
  hours: BranchHours | null;
  priceLevel: number | null;
  verificationStatus: "unverified" | "editor_verified" | "business_verified";
  rating: string;
  reviewCount: number;
  place: {
    id: string;
    slug: string;
    type: string;
    name: string;
    description: string | null;
  };
  neighborhood: Neighborhood | null;
  cuisines: Cuisine[];
  tags: Tag[];
  amenities: { id: string; name: string; slug: string }[];
  photos: BranchPhoto[];
  recentReviews: BranchReview[];
};

export function getBranch(id: string, getToken: TokenGetter) {
  return apiFetch<BranchDetail>(`/branches/${id}`, getToken);
}

export type MenuItem = {
  id: string;
  menuId: string;
  name: string;
  description: string | null;
  price: string;
  category: string | null;
  imageUrl: string | null;
  isAvailable: boolean;
  displayOrder: number;
};

export type Menu = {
  id: string;
  branchId: string;
  name: string;
  displayOrder: number;
  lastVerifiedAt: string | null;
  items: MenuItem[];
};

export function getBranchMenus(branchId: string, getToken: TokenGetter) {
  return apiFetch<Menu[]>(`/branches/${branchId}/menus`, getToken);
}

// Other locations of the same place (chains). Passing coords orders them
// nearest-first and adds a distance to each card.
export function getBranchSiblings(
  id: string,
  coords: { lat?: number; lng?: number } | undefined,
  getToken: TokenGetter,
) {
  const params = new URLSearchParams();
  if (coords?.lat != null) params.set("lat", String(coords.lat));
  if (coords?.lng != null) params.set("lng", String(coords.lng));
  const qs = params.toString();
  return apiFetch<BranchCard[]>(
    `/branches/${id}/siblings${qs ? `?${qs}` : ""}`,
    getToken,
  );
}

export type CreateReviewBody = {
  rating: number;
  text: string;
};

export function createReview(
  branchId: string,
  body: CreateReviewBody,
  getToken: TokenGetter,
) {
  return apiFetch<BranchReview>(`/branches/${branchId}/reviews`, getToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type UpdateReviewBody = { rating?: number; text?: string };

export function updateReview(
  reviewId: string,
  body: UpdateReviewBody,
  getToken: TokenGetter,
) {
  return apiFetch<BranchReview>(`/reviews/${reviewId}`, getToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function archiveReview(reviewId: string, getToken: TokenGetter) {
  return apiFetch<void>(`/reviews/${reviewId}`, getToken, { method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Photo upload (sign -> upload to Cloudinary -> register with the review)
// ---------------------------------------------------------------------------

type PhotoSignature = {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  uploadPreset: string;
  folder: string;
};

export type PickedPhoto = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
};

// Uploads one picked image: gets a signed payload, pushes the file straight to
// Cloudinary, then registers it against the review (user photos require a review).
export async function uploadReviewPhoto(
  branchId: string,
  reviewId: string,
  photo: PickedPhoto,
  getToken: TokenGetter,
): Promise<void> {
  const sig = await apiFetch<PhotoSignature>("/photos/sign", getToken, {
    method: "POST",
  });

  const form = new FormData();
  form.append("file", {
    uri: photo.uri,
    name: photo.fileName ?? "photo.jpg",
    type: photo.mimeType ?? "image/jpeg",
  } as unknown as Blob);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  form.append("upload_preset", sig.uploadPreset);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!uploadResponse.ok) {
    throw new Error("Photo upload failed");
  }

  const uploaded = (await uploadResponse.json()) as {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  };

  await apiFetch(`/branches/${branchId}/photos`, getToken, {
    method: "POST",
    body: JSON.stringify({
      publicId: uploaded.public_id,
      url: uploaded.secure_url,
      width: uploaded.width,
      height: uploaded.height,
      category: "food",
      reviewId,
    }),
  });
}
