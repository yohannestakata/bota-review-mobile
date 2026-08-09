import { debugLog } from "@/lib/debug";
import type { MenuPriceRange } from "@/lib/price";

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

export function registerDeviceToken(
  body: { token: string; platform?: "ios" | "android" },
  getToken: TokenGetter,
) {
  return apiFetch<void>("/notifications/device-tokens", getToken, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function unregisterDeviceToken(token: string, getToken: TokenGetter) {
  return apiFetch<void>("/notifications/device-tokens", getToken, {
    method: "DELETE",
    body: JSON.stringify({ token }),
  });
}

// ---------------------------------------------------------------------------
// Shared domain types
// ---------------------------------------------------------------------------

export type Neighborhood = { id: string; name: string; slug: string };
export type Cuisine = { id: string; name: string; slug: string };
export type FoodCategory = { id: string; name: string; slug: string };
export type Amenity = { id: string; name: string; slug: string };
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
  placeAvatarUrl?: string | null;
  label: string | null;
  neighborhood: Neighborhood | null;
  coverPhotoUrl: string | null;
  rating: number;
  reviewCount: number;
  priceLevel: number | null;
  menuPriceRange?: MenuPriceRange | null;
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

export function getAmenities(getToken: TokenGetter) {
  return apiFetch<Amenity[]>("/amenities", getToken);
}

export function getCuisines(getToken: TokenGetter) {
  return apiFetch<Cuisine[]>("/cuisines", getToken);
}

export function getFoodCategories(getToken: TokenGetter) {
  return apiFetch<FoodCategory[]>("/food-categories", getToken);
}

export function getTags(getToken: TokenGetter) {
  return apiFetch<Tag[]>("/tags", getToken);
}

// A published place as returned by the place search (GET /places?q=). Used to
// dedupe "missing place" tips: if the place already exists, the submitter is
// really adding a new branch to it.
export type PlaceSearchResult = {
  id: string;
  slug: string;
  type: string;
  name: string;
  branchCount: number;
};

export function searchPlaces(q: string, getToken: TokenGetter) {
  const params = new URLSearchParams({ q, limit: "6" });
  return apiFetch<PlaceSearchResult[]>(
    `/places?${params.toString()}`,
    getToken,
  );
}
