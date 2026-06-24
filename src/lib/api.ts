import { debugLog } from "@/lib/debug";

export type TokenGetter = () => Promise<string | null>;

export type CurrentUser = {
  id: string;
  clerkId: string;
  role: string;
  trustLevel: string;
  status: string;
};

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

export type FieldErrors = Record<string, { code: string; message: string }>;

export class ApiError extends Error {
  status: number;
  code?: string;
  fields?: FieldErrors;

  constructor(
    status: number,
    message: string,
    code?: string,
    fields?: FieldErrors,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

// Reads the backend error `code` (e.g. REVIEW_ALREADY_EXISTS) off a thrown
// error, or undefined for non-API errors.
export function getErrorCode(error: unknown): string | undefined {
  return error instanceof ApiError ? error.code : undefined;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export async function apiFetch<T>(
  path: string,
  getToken: TokenGetter,
  init: RequestInit = {},
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_BASE_URL");
  }

  const token = await getToken();
  debugLog("api", "request", {
    hasToken: Boolean(token),
    method: init.method ?? "GET",
    url: `${API_BASE_URL}${path}`,
  });

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    let code: string | undefined;
    let fields: FieldErrors | undefined;

    try {
      const body = (await response.json()) as {
        message?: string;
        code?: string;
        fields?: FieldErrors;
      };
      message = body.message || message;
      code = body.code;
      fields = body.fields;
    } catch {
      // Keep the status-derived message when the backend returns no JSON body.
    }

    debugLog("api", "request failed", {
      code,
      message,
      path,
      status: response.status,
    });

    throw new ApiError(response.status, message, code, fields);
  }

  debugLog("api", "request succeeded", {
    path,
    status: response.status,
  });

  // 204 (e.g. DELETE /saves) and empty bodies have no JSON to parse.
  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export function getCurrentUser(getToken: TokenGetter) {
  return apiFetch<CurrentUser>("/me", getToken);
}

// ---------------------------------------------------------------------------
// Shared domain types
// ---------------------------------------------------------------------------

export type Neighborhood = { id: string; name: string; slug: string };
export type Cuisine = { id: string; name: string; slug: string };
export type Tag = {
  id: string;
  name: string;
  slug: string;
  category: string | null;
};

// The card shape returned by discovery/home, search, and collections.
export type BranchCard = {
  id: string;
  slug: string;
  placeId: string;
  placeName: string;
  label: string | null;
  neighborhood: Neighborhood | null;
  coverPhotoUrl: string | null;
  rating: number;
  reviewCount: number;
  priceLevel: number | null;
  cuisines: Cuisine[];
  topTags: Tag[];
  informationLastVerifiedAt: string | null;
  status: string;
  displayOrder?: number;
  distanceKm?: number | null;
  isOpenNow?: boolean;
  verificationStatus?: "unverified" | "editor_verified" | "business_verified";
};

export function getNeighborhoods(getToken: TokenGetter) {
  return apiFetch<Neighborhood[]>("/neighborhoods", getToken);
}

// Maps the backend's numeric price level (1-4) to a "$"-"$$$$" label.
export function priceLabel(level: number | null): string {
  if (!level || level < 1) {
    return "";
  }

  return "$".repeat(Math.min(level, 4));
}
