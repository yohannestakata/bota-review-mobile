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

export type ReviewReply = {
  id: string;
  reviewId: string;
  authorRole: "owner" | "user";
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl: string | null;
    trustLevel: string;
  };
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
  photos: { id: string; url: string; width: number; height: number }[];
  // Approved replies (owner + user), oldest-first. Optional: older cached
  // responses predate replies.
  replies?: ReviewReply[];
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

// All approved reviews for a branch (the detail screen only carries the 5 most
// recent). Each review includes its own approved photos.
export function getBranchReviews(branchId: string, getToken: TokenGetter) {
  return apiFetch<BranchReview[]>(`/branches/${branchId}/reviews`, getToken);
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

// A single review by id — used to pre-populate the edit form from the source
// of truth rather than relying on values passed through route params.
export function getReview(reviewId: string, getToken: TokenGetter) {
  return apiFetch<BranchReview>(`/reviews/${reviewId}`, getToken);
}

export type CreateReviewBody = {
  rating: number;
  text: string;
  visitDate?: string; // ISO date (YYYY-MM-DD), optional, must be in the past
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

export function reportReview(
  reviewId: string,
  reason: string | undefined,
  getToken: TokenGetter,
) {
  return apiFetch<void>(`/reviews/${reviewId}/reports`, getToken, {
    method: "POST",
    body: JSON.stringify(reason ? { reason } : {}),
  });
}

// Reply to a review. The backend decides authorRole: a verified owner of the
// review's branch becomes an auto-approved "owner" reply; everyone else is a
// "user" reply that follows the normal review trust/moderation rules.
export function createReviewReply(
  reviewId: string,
  body: string,
  getToken: TokenGetter,
) {
  return apiFetch<ReviewReply & { moderationStatus: string }>(
    `/reviews/${reviewId}/replies`,
    getToken,
    { method: "POST", body: JSON.stringify({ body }) },
  );
}

export function updateReviewReply(
  replyId: string,
  body: string,
  getToken: TokenGetter,
) {
  return apiFetch<ReviewReply & { moderationStatus: string }>(
    `/replies/${replyId}`,
    getToken,
    { method: "PATCH", body: JSON.stringify({ body }) },
  );
}

export function deleteReviewReply(replyId: string, getToken: TokenGetter) {
  return apiFetch<{ success: boolean }>(`/replies/${replyId}`, getToken, {
    method: "DELETE",
  });
}

export type UpdateOwnerInfoBody = {
  phone?: string | null;
  hours?: BranchHours;
};

export function updateOwnerInfo(
  branchId: string,
  body: UpdateOwnerInfoBody,
  getToken: TokenGetter,
) {
  return apiFetch<BranchDetail>(`/branches/${branchId}/owner-info`, getToken, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function uploadOwnerPhoto(
  branchId: string,
  photo: PickedPhoto,
  getToken: TokenGetter,
): Promise<void> {
  const sig = await apiFetch<PhotoSignature>("/photos/sign", getToken, {
    method: "POST",
  });

  if (!photo.base64) throw new Error("Image is missing base64 data");
  const dataUri = `data:${photo.mimeType ?? "image/jpeg"};base64,${photo.base64}`;

  const form = new FormData();
  form.append("file", dataUri);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  if (sig.uploadPreset) form.append("upload_preset", sig.uploadPreset);

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!uploadResponse.ok) {
    let detail = `status ${uploadResponse.status}`;
    try {
      const body = (await uploadResponse.json()) as { error?: { message?: string } };
      detail = body.error?.message ?? detail;
    } catch { /* no json body */ }
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  const uploaded = (await uploadResponse.json()) as {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  };

  try {
    await apiFetch(`/branches/${branchId}/photos`, getToken, {
      method: "POST",
      body: JSON.stringify({
        publicId: uploaded.public_id,
        url: uploaded.secure_url,
        width: uploaded.width,
        height: uploaded.height,
        category: "food",
      }),
    });
  } catch (error) {
    void deleteCloudinaryPhoto(uploaded.public_id, getToken).catch(() => {});
    throw error;
  }
}

export type ClaimContactRole = "owner" | "manager" | "marketing";

export type ClaimVerificationMethod =
  | "business_email"
  | "social_media"
  | "phone_call"
  | "manual_review";

export type ClaimVerificationPlatform = "instagram" | "facebook" | "tiktok";

export type CreateClaimBody = {
  contactName: string;
  contactRole: ClaimContactRole;
  contactPhone: string;
  contactEmail: string;
  note?: string;
  verificationMethod: ClaimVerificationMethod;
  verificationPlatform?: ClaimVerificationPlatform;
  verificationEvidence?: string;
};

export type BusinessClaim = {
  id: string;
  branchId: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
};

export type OwnClaim = {
  id: string;
  branchId: string;
  status: "pending" | "verified" | "rejected";
  createdAt: string;
  branch: {
    id: string;
    label: string | null;
    slug: string;
    verificationStatus: string;
  };
};

// The current user's own claims, newest first — used to pre-check the claim
// form and to power the My Claims screen.
export function getMyClaims(getToken: TokenGetter) {
  return apiFetch<OwnClaim[]>("/me/claims", getToken);
}

// Submit a business-ownership claim for a branch. An admin verifies it, which
// grants the claimant the business_owner role and marks the branch verified.
export function createClaim(
  branchId: string,
  body: CreateClaimBody,
  getToken: TokenGetter,
) {
  return apiFetch<BusinessClaim>(`/branches/${branchId}/claims`, getToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export type UpdateReviewBody = {
  rating?: number;
  text?: string;
  visitDate?: string;
};

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
  uploadPreset?: string | null;
  folder: string;
};

// Cleans up an orphaned Cloudinary asset when backend registration fails after
// a successful upload. Best-effort — the backend also enqueues a delete job.
export function deleteCloudinaryPhoto(publicId: string, getToken: TokenGetter) {
  return apiFetch<void>(
    `/photos/cloudinary/${encodeURIComponent(publicId)}`,
    getToken,
    { method: "DELETE" },
  );
}

export type PickedPhoto = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
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

  // Cloudinary accepts the file as a base64 data-URI string. We use this rather
  // than a file part because RN's new architecture rejects both the
  // `{ uri, name, type }` FormData shape ("Unsupported FormDataPart
  // implementation") and `fetch(uri).blob()` ("Creating blobs from ArrayBuffer
  // ... not supported"). A plain string part has no such issue.
  if (!photo.base64) {
    throw new Error("Image is missing base64 data");
  }
  const dataUri = `data:${photo.mimeType ?? "image/jpeg"};base64,${photo.base64}`;

  const form = new FormData();
  form.append("file", dataUri);
  form.append("api_key", sig.apiKey);
  form.append("timestamp", String(sig.timestamp));
  form.append("signature", sig.signature);
  form.append("folder", sig.folder);
  // Only sent when the backend signs a preset — must match the signed params.
  if (sig.uploadPreset) {
    form.append("upload_preset", sig.uploadPreset);
  }

  const uploadResponse = await fetch(
    `https://api.cloudinary.com/v1_1/${sig.cloudName}/image/upload`,
    { method: "POST", body: form },
  );

  if (!uploadResponse.ok) {
    // Surface Cloudinary's actual error (e.g. "Invalid Signature", "Upload
    // preset not found") instead of a generic message.
    let detail = `status ${uploadResponse.status}`;
    try {
      const body = (await uploadResponse.json()) as {
        error?: { message?: string };
      };
      detail = body.error?.message ?? detail;
    } catch {
      // No JSON body — keep the status-derived detail.
    }
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  const uploaded = (await uploadResponse.json()) as {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  };

  try {
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
  } catch (error) {
    // Registration failed but the asset is already on Cloudinary — clean it up
    // so we don't leave an orphaned upload behind, then surface the error.
    void deleteCloudinaryPhoto(uploaded.public_id, getToken).catch(() => {});
    throw error;
  }
}
