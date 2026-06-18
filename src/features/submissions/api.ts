import { apiFetch, type TokenGetter } from "@/lib/api";

export type PlaceMissingDetails = {
  placeName: string;
  neighborhood?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
};

export function reportMissingPlace(
  details: PlaceMissingDetails,
  getToken: TokenGetter,
) {
  return apiFetch("/submissions", getToken, {
    method: "POST",
    body: JSON.stringify({ type: "place_missing", details }),
  });
}

export type BranchSubmissionBody =
  | {
      type: "field_correction";
      fieldName: string;
      currentValue?: string;
      suggestedValue?: string;
      note?: string;
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
