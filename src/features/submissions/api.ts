import { apiFetch, type TokenGetter } from "@/lib/api";

export type SubmissionHoursEntry = {
  day: "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
  open: string; // "HH:MM"
  close: string; // "HH:MM"
};

export type SubmissionMenuItem = { name: string; price?: number };

export type SubmissionStructuredDetails = {
  hours?: SubmissionHoursEntry[];
  menu?: SubmissionMenuItem[];
};

export type PlaceMissingDetails = {
  placeName: string;
  neighborhood?: string;
  description?: string;
  contactPhone?: string;
  contactEmail?: string;
  hours?: SubmissionHoursEntry[];
  menu?: SubmissionMenuItem[];
  amenities?: string[];
};

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
