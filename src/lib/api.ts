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

const SIGN_IN_AGAIN =
  "Your session timed out. Sign in again to pick up where you left off.";
const GONE = "This isn't available anymore. Go back and pull down to refresh.";

// Backend messages are written for developers ("User already has an active
// review for this branch"), so map known codes to copy that tells the user what
// to do next. Unmapped codes fall through to the status-based fallbacks below.
const MESSAGE_BY_CODE: Record<string, string> = {
  UNAUTHORIZED: SIGN_IN_AGAIN,
  INVALID_TOKEN: SIGN_IN_AGAIN,
  TOKEN_EXPIRED: SIGN_IN_AGAIN,
  ACCOUNT_SUSPENDED:
    "Your account is suspended. If you think that's a mistake, reach out to support.",
  FORBIDDEN: "You don't have access to do that with this account.",
  RATE_LIMITED: "You're moving fast! Wait a few seconds, then try again.",
  VALIDATION_ERROR:
    "Something in there didn't look right. Double-check your entries and try again.",
  NOT_FOUND: GONE,
  PLACE_NOT_FOUND: GONE,
  BRANCH_NOT_FOUND: GONE,
  COLLECTION_NOT_FOUND: GONE,
  MENU_NOT_FOUND: GONE,
  MENU_ITEM_NOT_FOUND: GONE,
  PHOTO_NOT_FOUND: GONE,
  REVIEW_NOT_FOUND: "That review was removed. Pull down to refresh the list.",
  REPLY_NOT_FOUND: "That reply was removed. Pull down to refresh the list.",
  REVIEW_ALREADY_EXISTS:
    "You've already reviewed this place. Edit it anytime from Profile → Your reviews.",
  REVIEW_CANNOT_REPORT_OWN:
    "That's your own review. You can edit or delete it from Profile → Your reviews.",
  REPLY_ALREADY_EXISTS:
    "You've already replied here. Edit your reply from Profile → Your replies.",
  REPLY_CANNOT_REPORT_OWN:
    "That's your own reply. You can edit or delete it from Profile → Your replies.",
  REPLY_CANNOT_REPLY_OWN:
    "You can't reply to your own review, but you can edit it to add more.",
  PHOTO_LIMIT_REACHED:
    "This place has hit its photo limit. Remove one before adding another.",
  CLAIM_ALREADY_PENDING:
    "A claim for this business is already being reviewed. We'll let you know once it's done.",
  CLAIM_ALREADY_VERIFIED:
    "This business has already been claimed and verified.",
};

// Turns any thrown error into copy that says what went wrong and how to fix it.
// Never surfaces raw backend/developer text.
export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    const mapped = error.code ? MESSAGE_BY_CODE[error.code] : undefined;
    if (mapped) return mapped;
    if (error.status === 401) return SIGN_IN_AGAIN;
    if (error.status === 404) return GONE;
    if (error.status === 413) {
      return "That's too large to upload. Try a smaller photo.";
    }
    if (error.status === 429) return MESSAGE_BY_CODE.RATE_LIMITED;
    if (error.status >= 500) {
      return "Our servers hit a bump. Give it a minute and try again.";
    }
    return "That didn't go through. Try again, and if it keeps happening, restart the app.";
  }

  // React Native's fetch rejects with a TypeError when there's no connection.
  if (
    error instanceof TypeError &&
    /network request failed/i.test(error.message)
  ) {
    return "You seem to be offline. Check your connection and try again.";
  }

  if (error instanceof Error && /cloudinary/i.test(error.message)) {
    return "A photo couldn't upload. Check your connection or try a different photo.";
  }

  return "Something went wrong on our end. Try again in a moment.";
}

/** An abort signal that fires after `ms` (AbortSignal.timeout isn't in RN). */
export function timeoutSignal(ms: number) {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
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
    // Don't hang on a dead connection: fail so cached data and retries take
    // over (uploads send a lot of data, so they get longer).
    signal: init.signal ?? timeoutSignal(init.body ? 60_000 : 15_000),
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
  /** Instant blurred placeholder for the cover (ThumbHash, base64). */
  coverPhotoThumbhash?: string | null;
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
  /** Weekly hours, sent alongside isOpenNow (e.g. { mon: [["07:00","20:00"]] }). */
  hours?: Record<string, [string, string][]> | null;
  /** Why "For you" picked this place, e.g. "Like Kaldi's Coffee, which you saved". */
  reason?: string;
  /** Sent by search/browse for the map view (numeric strings). */
  latitude?: string | null;
  longitude?: string | null;
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
