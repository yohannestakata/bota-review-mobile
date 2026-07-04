import type { PickedPhoto } from "@/features/branch/api";
import { apiFetch, type TokenGetter } from "@/lib/api";

export type SubmissionPhoto = {
  publicId: string;
  url: string;
  width: number;
  height: number;
};

export type SubmissionHoursEntry = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string; // "HH:MM"
  close: string; // "HH:MM"
};

export type SubmissionMenuItem = {
  name: string;
  price?: number;
  // A photo the submitter uploaded for this item (Cloudinary ref), attached to
  // the menu item on approve.
  imageUrl?: string;
  publicId?: string;
};

export type SubmissionStructuredDetails = {
  hours?: SubmissionHoursEntry[];
  menu?: SubmissionMenuItem[];
  cuisines?: string[];
  tags?: string[];
  amenities?: string[];
};

export type PlaceMissingDetails = {
  placeName: string;
  // Set when the submitter matched an existing place; the tip becomes a new
  // branch of that place instead of a duplicate place.
  existingPlaceId?: string;
  neighborhood?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  latitude?: number;
  longitude?: number;
  type?: "restaurant" | "cafe" | "bakery" | "bar";
  hours?: SubmissionHoursEntry[];
  menu?: SubmissionMenuItem[];
  cuisines?: string[];
  tags?: string[];
  amenities?: string[];
  photos?: SubmissionPhoto[];
};

type PhotoSignature = {
  signature: string;
  timestamp: number;
  cloudName: string;
  apiKey: string;
  uploadPreset?: string | null;
  folder: string;
};

// Uploads a picked image straight to Cloudinary and returns its reference. Unlike
// the review/owner flows there's no branch to register against yet — the ref is
// carried in the submission and attached as a pending photo on approve.
export async function uploadSubmissionPhoto(
  photo: PickedPhoto,
  getToken: TokenGetter,
): Promise<SubmissionPhoto> {
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
      const body = (await uploadResponse.json()) as {
        error?: { message?: string };
      };
      detail = body.error?.message ?? detail;
    } catch {
      /* no json body */
    }
    throw new Error(`Cloudinary upload failed: ${detail}`);
  }

  const uploaded = (await uploadResponse.json()) as {
    public_id: string;
    secure_url: string;
    width: number;
    height: number;
  };

  return {
    publicId: uploaded.public_id,
    url: uploaded.secure_url,
    width: uploaded.width,
    height: uploaded.height,
  };
}

export function reportMissingPlace(
  details: PlaceMissingDetails,
  getToken: TokenGetter,
  note?: string,
) {
  return apiFetch("/submissions", getToken, {
    method: "POST",
    body: JSON.stringify({
      type: "place_missing",
      details,
      ...(note ? { note } : {}),
    }),
  });
}

export type BranchSubmissionBody =
  | {
      type: "field_correction";
      fieldName: string;
      currentValue?: string;
      suggestedValue?: string;
      note?: string;
      details?: SubmissionStructuredDetails;
    }
  | { type: "temporarily_closed"; note?: string }
  | { type: "permanently_closed"; note?: string };

export function createBranchSubmission(
  branchId: string,
  body: BranchSubmissionBody,
  getToken: TokenGetter,
) {
  return apiFetch(`/branches/${branchId}/submissions`, getToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}
