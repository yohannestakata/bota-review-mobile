# Bota Review — Mobile Screens Specification

**Version:** 1.0  
**Scope:** Consumer-facing screens — Phases 2–3 (Discovery + Contribution)  
**Platform:** Android-first, Expo SDK 56  
**Excludes:** Admin and editor tooling (separate web app, not covered here)

---

## How to Read This Document

Each screen defines:
- **Route** — file path in `app/`
- **Purpose** — what decision or action this screen serves
- **Data sources** — API endpoints and React Query hooks
- **States** — loading, empty, error, populated — and what each looks like
- **Layout** — structural breakdown, top to bottom
- **Interactions** — what's tappable and where it goes
- **Analytics** — events fired on this screen
- **Not in MVP** — screen-specific deferrals

This document assumes familiarity with `04-mvp-feature-requirements.md` (API contracts) and `03-mobile-standards.md` (component and navigation conventions).

---

## Screen Inventory

| # | Screen | Route | Phase |
|---|---|---|---|
| 1 | Home | `app/(tabs)/index.tsx` | 2 |
| 2 | Discover (Browse + Filters) | `app/(tabs)/discover.tsx` | 2 |
| 3 | Search Results | `app/search.tsx` | 2 |
| 4 | Filter Bottom Sheet | `src/components/branch/filter-bottom-sheet.tsx` | 2 |
| 5 | Branch Detail | `app/branch/[id].tsx` | 2 |
| 6 | Place Overview | `app/place/[id].tsx` | 2 |
| 7 | Collection | `app/collection/[slug].tsx` | 2 |
| 8 | Photo Gallery (full screen) | `app/branch/[id]/photos.tsx` | 2 |
| 9 | Sign In / Sign Up | `app/(auth)/sign-in.tsx`, `sign-up.tsx` | 3 |
| 10 | Write / Edit Review | `app/review/write.tsx` | 3 |
| 11 | Saved Branches | `app/(tabs)/saved.tsx` | 3 |
| 12 | Own Profile | `app/profile/index.tsx` | 3 |
| 13 | Public Profile | `app/profile/[id].tsx` | 3 |
| 14 | Suggest an Edit | `app/branch/[id]/suggest-edit.tsx` | 3 |
| 15 | Business Claim Form | `app/claim/[branchId].tsx` | 3 |
| 16 | My Claims | `app/profile/claims.tsx` | 3 |

---

## 1. Home

**Route:** `app/(tabs)/index.tsx`  
**Purpose:** First screen most users see. Editorial, curated entry point — answers "what's good right now" without requiring a search.

### Data sources

```
GET /v1/discovery/home   → useHomeScreen()
```

Cached server-side (Redis, 5-minute TTL) — client-side `staleTime: 1000 * 60 * 5` matches.

### Layout

Top to bottom, rendered via `FlashList` with `getItemType` for section types:

```
┌─────────────────────────────────┐
│ Header: "Bota" logo + search bar │  ← tap opens Search Results screen
├─────────────────────────────────┤
│ Section: "Best cafés to work     │
│  from" (curated_collection)      │  ← horizontal FlashList of BranchCard
│  [card][card][card]→             │     "See all" → Collection screen
├─────────────────────────────────┤
│ Section: "Recently verified"     │  ← horizontal FlashList
│  [card][card][card]→             │
├─────────────────────────────────┤
│ Section: "Highly rated"          │  ← horizontal FlashList
│  [card][card][card]→             │
├─────────────────────────────────┤
│ Section: "New to Bota"           │  ← horizontal FlashList
│  [card][card][card]→             │
└─────────────────────────────────┘
```

Section order and which collections appear is entirely server-driven — the screen renders whatever sections the API returns, in order. No hardcoded section list on the client.

### States

| State | Behaviour |
|---|---|
| Loading | Skeleton sections — 3 placeholder cards per section, shimmer effect |
| Error | `ErrorScreen` with retry — home screen failure is jarring, retry is prominent |
| Empty (no sections) | Should not happen in practice once seeded; falls back to a static "Explore" message pointing to Discover tab |
| Populated | As above |

### Interactions

- Tap search bar → navigate to Search Results screen (Screen 3), keyboard focused
- Tap a `BranchCard` → `router.push('/branch/[id]')` (Screen 5)
- Tap "See all" on a section → `router.push('/collection/[slug]')` (Screen 7)
- Pull to refresh → invalidates `queryKeys.discovery.home()`

### Analytics

- `collection_viewed` fired when a collection section scrolls into view (first time only per session) — `properties: { collection_slug }`
- `branch_viewed` fired on card tap with `properties: { source: 'home' }`

### Not in MVP

- Personalization based on user history
- "Trending" section
- Location-based "near you" section

---

## 2. Discover (Browse + Filters)

**Route:** `app/(tabs)/discover.tsx`  
**Purpose:** Primary browsing tab. Users explore all published branches with filters and sorting — the "I don't know what I want yet, show me options" flow.

### Data sources

```
GET /v1/branches?neighborhoodId=&cuisineId=&priceLevel=&tagIds=&sort=&limit=&offset=
  → useBranchList(filters)

GET /v1/neighborhoods    → useNeighborhoods()  (cached 30 min)
GET /v1/cuisines         → useCuisines()       (cached 30 min)
GET /v1/tags              → useTags()           (cached 30 min)
```

Filter state lives in `useFiltersStore` (Zustand) — persists across tab switches within a session, resets on app restart (not persisted to storage).

### Layout

```
┌─────────────────────────────────┐
│ Header: "Discover"               │
│ [Sort ▾]  [Filters (2) ▾]        │  ← Sort opens inline dropdown
├─────────────────────────────────┤   Filters opens Bottom Sheet (Screen 4)
│ Active filter chips (scrollable) │  ← "Bole ✕" "Coffee ✕" — tap ✕ removes
├─────────────────────────────────┤
│ FlashList of BranchCard          │
│ [card]                            │
│ [card]                            │
│ [card]                            │
│ ...                               │
│ [Load more] (pagination)          │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading (initial) | Skeleton cards (5–6), shimmer |
| Loading (pagination) | Spinner footer at list bottom, existing items remain |
| Error | `ErrorScreen` with retry |
| Empty (no results) | `EmptyState`: "No places match your filters" + "Clear filters" button |
| Populated | List as above |

### Interactions

- Tap "Sort ▾" → inline dropdown: Top rated · Most reviewed · Recently verified · Newly added
- Tap "Filters ▾" → opens `FilterBottomSheet` (Screen 4); badge shows active filter count
- Tap a filter chip's ✕ → removes that filter, refetches
- Tap `BranchCard` → `router.push('/branch/[id]')`
- Scroll to bottom → loads next page (`offset += limit`)
- Pull to refresh → resets to `offset: 0`, refetches

### Pagination

`X-Total-Count` header drives "load more" — when `data.length >= total`, no further pagination triggers.

### Analytics

- `filter_applied` on every filter change — `properties: { filter_type, filter_value }`
- `branch_viewed` on card tap — `properties: { source: 'discover' }`

### Not in MVP

- Map view toggle
- Saved filter presets
- "Near me" sort (requires location)

---

## 3. Search Results

**Route:** `app/search.tsx`  
**Purpose:** Free-text search, reached from Home's search bar. Returns matching branches.

### Data sources

```
GET /v1/search?q=&neighborhoodId=&cuisineId=&priceLevel=&limit=&offset=
  → useSearch(query, filters)
```

`enabled: query.length >= 2` — below 2 characters, no request fires and the screen shows a prompt state instead.

### Layout

```
┌─────────────────────────────────┐
│ [← ] [Search input, focused    ] │  ← back arrow returns to Home
├─────────────────────────────────┤
│ (no query / < 2 chars)           │
│   "Search for restaurants,       │
│    cafés, and more"              │
│                                    │
│ (query >= 2 chars)                │
│   FlashList of BranchCard results │
└─────────────────────────────────┘
```

Filters from the Discover tab's `useFiltersStore` apply here too — same Bottom Sheet (Screen 4) accessible via a filter icon next to the search input.

### States

| State | Behaviour |
|---|---|
| Prompt (query < 2 chars) | Centered prompt text, no request fired |
| Loading | Skeleton cards |
| Error | `ErrorScreen` with retry |
| Empty (0 results) | `EmptyState`: "No results for '{query}'" + suggestion to try different terms or browse Discover. `search_no_results` fired. |
| Populated | Result list |

### Interactions

- Type in search input → debounced (300ms) query trigger
- Tap filter icon → `FilterBottomSheet` (Screen 4)
- Tap `BranchCard` → `router.push('/branch/[id]')`
- Tap back arrow → `router.back()` to Home

### Analytics

- `search_submitted` fired on debounced query (not every keystroke) — `properties: { query, result_count }`
- `search_no_results` fired client-side when `data.length === 0` — `properties: { query, filters }` (backend also fires this server-side independently)
- `branch_viewed` on tap — `properties: { source: 'search' }`

### Not in MVP

- Search suggestions / autocomplete
- Recent search history
- Voice search

---

## 4. Filter Bottom Sheet

**Component:** `src/components/branch/filter-bottom-sheet.tsx` (not a route — presented over Discover or Search)  
**Purpose:** Shared filter UI for Discover and Search screens.

### Implementation

Built with Expo UI's `BottomSheet` (see `03-mobile-standards.md`). Native presentation, gesture-dismissible.

### Data sources

```
GET /v1/neighborhoods  → useNeighborhoods()
GET /v1/cuisines       → useCuisines()
GET /v1/tags           → useTags()  (grouped by category)
```

Each taxonomy endpoint returns item counts — displayed next to each option (e.g. "Bole (24)").

### Layout

```
┌─────────────────────────────────┐
│ Filters                    [✕]   │
├─────────────────────────────────┤
│ Neighborhood (single-select)     │
│  ○ Bole (24)   ○ Kazanchis (18)  │
│  ○ CMC (12)    ○ ... [show more] │
├─────────────────────────────────┤
│ Cuisine (multi-select chips)     │
│  [Ethiopian] [Coffee] [Italian]  │
│  [Burger] [Bakery] [...]         │
├─────────────────────────────────┤
│ Price (multi-select)             │
│  [ETB] [ETB ETB] [ETB ETB ETB]   │
│  [ETB ETB ETB ETB]               │
├─────────────────────────────────┤
│ Tags (multi-select, grouped)     │
│  Vibe: [Date-friendly] [Quiet]   │
│  Diet: [Fasting-friendly]        │
│  Time: [Brunch] [Late-night]     │
├─────────────────────────────────┤
│ [Clear all]      [Show N places] │
└─────────────────────────────────┘
```

"Show N places" — the count updates live as filters change, requires a debounced count-only query or client-side estimate from the last full fetch. Simplest MVP approach: fetch with `limit: 1` to read `X-Total-Count` on filter change, debounced 300ms.

### Interactions

- Single-select neighborhood — tapping a new one deselects the previous
- Multi-select cuisine/price/tags — toggle on/off
- "Clear all" resets `useFiltersStore` to initial state
- "Show N places" applies filters and closes the sheet
- Swipe down or tap ✕ → closes without discarding already-applied filters (only un-applied in-sheet changes are discarded)

### Analytics

- `filter_applied` fired once per filter category change when "Show N places" is tapped — not per individual toggle, to avoid event spam

---

## 5. Branch Detail

**Route:** `app/branch/[id].tsx`  
**Purpose:** The most important screen in the app. Everything a user needs to decide whether to go to this specific branch.

### Data sources

```
GET /v1/branches/:id          → useBranchDetail(id)
GET /v1/branches/:id/photos   → useBranchPhotos(id)
GET /v1/branches/:id/menus    → useBranchMenus(id)
GET /v1/branches/:id/reviews  → useBranchReviews(id)  (paginated)
GET /v1/me/saves              → useSavedBranchIds()  (to show save state)
```

### Layout

```
┌─────────────────────────────────┐
│ [← back]          [share] [⋮]    │  ← ⋮ menu: report, suggest edit, claim
├─────────────────────────────────┤
│ Cover photo (full width, 240px)  │  ← tap → Photo Gallery (Screen 8)
│  [photo count badge: "1/12"]     │
├─────────────────────────────────┤
│ Place name                        │
│ Branch label (if multi-branch)   │
│ ★ 4.5 (128 reviews)  ·  ETB ETB  │
│ Cuisine tags: Ethiopian, Coffee   │
├─────────────────────────────────┤
│ [Save ♡]  [Directions]  [Call]   │  ← row of primary actions
├─────────────────────────────────┤
│ Top tags: Date-friendly,          │
│  Work-friendly, Fasting-friendly  │
├─────────────────────────────────┤
│ Address + map snippet             │
│ Open now / Closes at 22:00        │  ← computed from hours + current time
│  [Hours ▾] (expandable, full week)│
├─────────────────────────────────┤
│ "Last verified 3 days ago"        │  ← informationLastVerifiedAt
├─────────────────────────────────┤
│ Menu section (tab or expandable)  │
│  Menu name, "Last verified ..."   │
│  Item: name · price · description │
│  (is_available: false → greyed,   │
│   labeled "Currently unavailable")│
├─────────────────────────────────┤
│ Photos preview (horizontal strip) │
│  [photo][photo][photo] "See all → │
├─────────────────────────────────┤
│ Reviews section                   │
│  "Write a review" button          │  ← if authenticated and no active review
│  [review][review][review]         │
│  "See all N reviews →"            │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading | Full skeleton — cover image placeholder, text bars |
| Error | `ErrorScreen` with retry. If `BRANCH_NOT_FOUND`, message: "This place may have been removed." with a button back to Discover |
| Populated, no photos | Should not occur — publish requires ≥1 photo. If it does, show placeholder cover |
| Populated, no menu | Menu section hidden entirely |
| Populated, no reviews | Reviews section shows `EmptyState`: "No reviews yet. Be the first to share your experience." + "Write a review" button |

### Hours display logic

Computed client-side from `branch.hours` (JSONB) + current device time:

- If current time falls within today's open/close window → "Open now · Closes at {close}"
- If `closed: true` for today, or outside hours → "Closed now · Opens {next open day/time}"
- Expandable "Hours ▾" shows all 7 days

### Interactions

- Tap cover photo or photo strip → `router.push('/branch/[id]/photos')` (Screen 8)
- Tap "Save ♡" (unauthenticated) → prompts sign-in (Screen 9), then completes save on return
- Tap "Save ♡" (authenticated) → optimistic toggle, `useSaveBranch` / `useUnsaveBranch`
- Tap "Directions" → opens device map app via `Linking` with branch lat/lng — fires `directions_clicked`
- Tap "Call" → opens device dialer via `Linking` with branch phone — fires `phone_clicked`
- Tap "Write a review" → `router.push('/review/write?branchId=...')` (Screen 10) — if unauthenticated, prompts sign-in first
- Tap "⋮" menu → action sheet: "Suggest an edit" (Screen 14), "Is this your business?" (Screen 15, only if no active claim), "Report listing"
- Tap "See all N reviews" → expands inline or pushes a dedicated reviews list (simplest: expand inline with `FlashList`, no separate route)
- Tap place name (if branch belongs to a multi-branch place) → `router.push('/place/[id]')` (Screen 6)

### Analytics

- `branch_viewed` — fired on mount, `properties: { source }` where `source` is passed via route params from the originating screen
- `menu_viewed` — fired when menu section is scrolled into view or tab tapped
- `directions_clicked`, `phone_clicked`, `branch_saved`, `branch_unsaved`, `share_clicked` — fired on respective taps
- `review_started` — fired when "Write a review" is tapped

### Not in MVP

- Map preview is a static snippet (image or simple pin), not an interactive embedded map
- "Similar places" section
- Business owner response display (Phase 5)

---

## 6. Place Overview

**Route:** `app/place/[id].tsx`  
**Purpose:** For places with multiple branches — shows the brand and lets users pick which location.

### Data sources

```
GET /v1/places/:id   → usePlaceDetail(id)
```

Response includes the place's branches list (branch cards).

### Layout

```
┌─────────────────────────────────┐
│ [← back]                          │
├─────────────────────────────────┤
│ Place name                        │
│ Place description (if any)        │
├─────────────────────────────────┤
│ "N locations"                     │
│ [BranchCard - Bole]               │
│ [BranchCard - CMC]                │
│ [BranchCard - Kazanchis]          │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading | Skeleton |
| Error | `ErrorScreen` with retry; `PLACE_NOT_FOUND` → message + back to Discover |
| Single branch | Still shows the place overview with one BranchCard — consistent navigation pattern even though most places at MVP have one branch |

### Interactions

- Tap a `BranchCard` → `router.push('/branch/[id]')` (Screen 5)

### Analytics

- No dedicated event — `branch_viewed` fires on the subsequent Branch Detail screen with `properties: { source: 'place_overview' }`

---

## 7. Collection

**Route:** `app/collection/[slug].tsx`  
**Purpose:** Full view of a curated collection — reached via "See all" from Home.

### Data sources

```
GET /v1/discovery/collections/:slug   → useCollection(slug)
```

### Layout

```
┌─────────────────────────────────┐
│ [← back]                          │
├─────────────────────────────────┤
│ Cover image (if set)              │
│ Collection name                   │
│ Description                       │
├─────────────────────────────────┤
│ FlashList of BranchCard           │
│ [card]                            │
│ [card]                            │
│ ...                                │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading | Skeleton |
| Error | `ErrorScreen`; `COLLECTION_NOT_FOUND` → back to Home |
| Populated | Vertical list of cards (collections always have ≥6 branches per business rule — empty state should not occur) |

### Interactions

- Tap `BranchCard` → `router.push('/branch/[id]')`

### Analytics

- `collection_viewed` — fired on mount, `properties: { collection_slug }`
- `branch_viewed` on card tap — `properties: { source: 'collection', collection_slug }`

---

## 8. Photo Gallery (Full Screen)

**Route:** `app/branch/[id]/photos.tsx`  
**Purpose:** Full-screen, swipeable photo viewer for a branch's approved photos.

### Data sources

```
GET /v1/branches/:id/photos   → useBranchPhotos(id)
```

Likely already cached from the Branch Detail screen — no refetch needed if navigated from there.

### Layout

```
┌─────────────────────────────────┐
│ [✕]                    "3 / 12"  │
├─────────────────────────────────┤
│                                    │
│      Full-screen photo            │
│      (swipeable, pinch-zoom)      │
│                                    │
├─────────────────────────────────┤
│ Category label: "Food"            │
│ [thumbnail strip, current         │
│  highlighted]                     │
└─────────────────────────────────┘
```

### Interactions

- Swipe left/right → next/previous photo
- Pinch → zoom
- Tap ✕ → `router.back()`
- Tap thumbnail in strip → jumps to that photo

### Analytics

- None beyond what's already fired on Branch Detail — this is considered part of the same viewing session

### Not in MVP

- Photo upload from this screen (uploads happen via review flow only at MVP)
- Photo reporting

---

## 9. Sign In / Sign Up

**Routes:** `app/(auth)/sign-in.tsx`, `app/(auth)/sign-up.tsx`  
**Purpose:** Authentication via Clerk. Custom UI using Clerk's Expo SDK headless hooks — not Clerk's pre-built components.

### Data sources

Clerk Expo SDK (`useSignIn`, `useSignUp`, `useOAuth`) — no Bota backend calls until the user record sync happens via webhook (server-side, transparent to the client).

### Layout — Sign In

```
┌─────────────────────────────────┐
│ Bota logo                         │
│ "Welcome back"                    │
├─────────────────────────────────┤
│ [Continue with Google]            │  ← primary, OAuth
├─────────────────────────────────┤
│ ── or ──                          │
├─────────────────────────────────┤
│ Email input                       │
│ Password input                    │
│ [Sign in]                         │
├─────────────────────────────────┤
│ "Don't have an account? Sign up"  │  ← → Sign Up screen
└─────────────────────────────────┘
```

### Layout — Sign Up

Same structure, with display name field added for email signup. Google OAuth signup populates display name and avatar from the Google account automatically (synced via Clerk webhook).

### States

| State | Behaviour |
|---|---|
| Loading (OAuth in progress) | Spinner overlay |
| Error (invalid credentials) | Inline error below the relevant field, using Clerk's error codes mapped to friendly copy |
| Success | Redirect to the screen that triggered sign-in (deep link return), or Home if entered directly |

### When this screen is reached

Sign-in is not required to browse, search, or view branch details. It's triggered contextually:
- Tapping "Save" while unauthenticated
- Tapping "Write a review" while unauthenticated
- Tapping "Is this your business?" while unauthenticated
- Direct navigation via a "Sign in" button in the tab bar / profile area

On successful sign-in, the app returns to the originating screen and completes the original action (e.g. completes the save).

### Not in MVP

- Phone number authentication
- Password reset flow UI (Clerk-hosted fallback acceptable if needed)
- Social providers beyond Google

---

## 10. Write / Edit Review

**Route:** `app/review/write.tsx`  
**Query params:** `branchId` (required), `reviewId` (optional — present when editing)

**Purpose:** Authenticated users write or edit a review for a branch.

### Data sources

```
POST   /v1/branches/:id/reviews   → useSubmitReview(branchId)
PATCH  /v1/reviews/:id            → useEditReview(reviewId)
POST   /v1/photos/sign            → for review photo uploads
POST   /v1/branches/:id/photos    → register uploaded review photos
```

If `reviewId` is present, the form is pre-populated by fetching `GET /v1/reviews/:id` (or passed via params if navigating from the user's own review list).

### Form

Uses `react-hook-form` + `zodResolver(reviewFormSchema)` per `03-mobile-standards.md`.

### Layout

```
┌─────────────────────────────────┐
│ [✕]              "Write a review"│  (or "Edit review")
├─────────────────────────────────┤
│ Branch name (read-only context)  │
├─────────────────────────────────┤
│ Rating: ★ ★ ★ ★ ☆ (tappable)     │
├─────────────────────────────────┤
│ Review text (multiline)          │
│  "Share your experience..."      │
│  Character count: 142 / 2000     │
├─────────────────────────────────┤
│ Visit date (optional, date picker)│
├─────────────────────────────────┤
│ Add photos (up to 3)             │
│  [+] [photo] [photo]              │
├─────────────────────────────────┤
│ [Submit review]                   │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Validation error | Inline under each field via React Hook Form — min 20 chars enforced before submit |
| Submitting | Submit button shows spinner, disabled |
| Server validation error (422) | Backend `fields` mapped onto form via `setError` |
| `REVIEW_ALREADY_EXISTS` (409) | Shown as a banner: "You've already reviewed this place." with a link to edit the existing review instead |
| Success | `router.back()` to Branch Detail, which refetches reviews |

### Interactions

- Tap stars → sets rating (1–5), required before submit
- Type review text → live character count, red when approaching 2000
- Tap "Add photos" → opens device photo picker (`expo-image-picker`), up to 3 photos, each uploaded via the photo upload flow (Screen-independent, see `03-mobile-standards.md`)
- Tap ✕ → confirms discard if form is dirty
- Tap "Submit review" → validates, submits, handles errors as above

### Analytics

- `review_started` — fired on screen mount (also fired on Branch Detail tap, but this confirms the screen was actually reached)
- `review_submitted` — fired on success, `properties: { branch_id, rating }`

### Not in MVP

- Draft autosave
- Rich text formatting
- Tagging specific menu items in a review

---

## 11. Saved Branches

**Route:** `app/(tabs)/saved.tsx`  
**Purpose:** Authenticated users' bookmarked branches.

### Data sources

```
GET /v1/me/saves   → useSavedBranches()  (paginated, branch card format)
```

Requires authentication — if unauthenticated, shows a sign-in prompt instead of the list.

### Layout

```
┌─────────────────────────────────┐
│ "Saved"                           │
├─────────────────────────────────┤
│ FlashList of BranchCard           │
│ [card]                            │
│ [card] (archived → "Unavailable") │
│ ...                                │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Unauthenticated | Centered prompt: "Sign in to save your favorite places" + "Sign in" button → Screen 9 |
| Loading | Skeleton cards |
| Error | `ErrorScreen` with retry |
| Empty | `EmptyState`: "No saved places yet" + "Explore" button → Discover tab |
| Populated, includes archived branch | That card shows a muted/greyed treatment with an "Unavailable" badge — still tappable but Branch Detail will show the `BRANCH_NOT_FOUND` / archived state |

### Interactions

- Tap `BranchCard` → `router.push('/branch/[id]')`
- Swipe to remove (or long-press → "Remove from saved") → `useUnsaveBranch`, optimistic removal from list

### Analytics

- `branch_viewed` on tap — `properties: { source: 'saved' }`
- `branch_unsaved` on removal

---

## 12. Own Profile

**Route:** `app/profile/index.tsx`  
**Purpose:** Authenticated user's own account hub — reviews, saves shortcut, claims, sign out.

### Data sources

```
GET /v1/me            → useOwnProfile()
GET /v1/me/reviews    → useOwnReviews()  (all statuses)
```

### Layout

```
┌─────────────────────────────────┐
│ Avatar · Display name             │
│ "Member since {join date}"        │
├─────────────────────────────────┤
│ Stats row: N reviews · N saved    │  ← N saved links to Saved tab
├─────────────────────────────────┤
│ "My Reviews"                      │
│  [review card] (status badge if   │
│   pending/rejected)               │
│  [review card]                    │
│  ...                               │
├─────────────────────────────────┤
│ "My Claims" → Screen 16           │  ← only shown if user has ≥1 claim
├─────────────────────────────────┤
│ [Sign out]                        │
└─────────────────────────────────┘
```

### Review status badges

- `approved` → no badge (default)
- `pending` → "Under review" badge
- `rejected` → "Not approved" badge — tapping shows a generic explanation (not the internal rejection reason, which is not exposed at MVP)

### States

| State | Behaviour |
|---|---|
| Unauthenticated | This screen is unreachable — tab/nav shows Sign In instead |
| Loading | Skeleton |
| Error | `ErrorScreen` with retry |
| No reviews yet | "My Reviews" section shows `EmptyState`: "You haven't written any reviews yet" |

### Interactions

- Tap a review card → `router.push('/review/write?branchId=...&reviewId=...')` (Screen 10, edit mode)
- Tap "My Claims" → `router.push('/profile/claims')` (Screen 16)
- Tap "Sign out" → confirms, then Clerk `signOut()`, redirects to Home

### Not in MVP

- Editable display name / avatar (synced from Clerk only)
- Account deletion

---

## 13. Public Profile

**Route:** `app/profile/[id].tsx`  
**Purpose:** View another user's public reviews — reached by tapping a reviewer's name on a review.

### Data sources

```
GET /v1/users/:id/profile   → usePublicProfile(id)
GET /v1/users/:id/reviews   → usePublicReviews(id)  (approved only, paginated)
```

### Layout

```
┌─────────────────────────────────┐
│ Avatar · Display name             │
│ "Member since {join date}"        │
│ "N reviews"                       │
├─────────────────────────────────┤
│ FlashList of review cards         │
│  (each links to the branch)       │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading | Skeleton |
| Error | `ErrorScreen`; `USER_NOT_FOUND` → generic "User not found" |
| No reviews | `EmptyState`: "No reviews yet" |
| User is "Deleted User" | Profile still renders with "Deleted User" name, reviews remain visible |

### Interactions

- Tap a review's branch reference → `router.push('/branch/[id]')`

---

## 14. Suggest an Edit

**Route:** `app/branch/[id]/suggest-edit.tsx`  
**Purpose:** Authenticated users flag inaccurate branch information.

### Data sources

```
POST /v1/branches/:id/submissions   → useSubmitEdit(branchId)
POST /v1/submissions                → for type: place_missing (different entry point — see Not in MVP)
```

### Layout

```
┌─────────────────────────────────┐
│ [✕]          "Suggest an edit"   │
├─────────────────────────────────┤
│ "What needs updating?"            │
│  ○ Address or phone number        │
│  ○ Hours                          │
│  ○ Menu or prices                 │
│  ○ Temporarily closed             │
│  ○ Permanently closed             │
│  ○ Something else                 │
├─────────────────────────────────┤
│ (conditional, based on selection) │
│ Current value: "{shown for ref}"  │
│ Suggested value: [text input]     │
├─────────────────────────────────┤
│ Additional note (optional)        │
│  [text area, max 500]             │
├─────────────────────────────────┤
│ [Submit]                          │
└─────────────────────────────────┘
```

### Type mapping

| User selection | `type` sent | `field_name` |
|---|---|---|
| Address or phone number | `field_correction` | `address_text` or `phone` |
| Hours | `field_correction` | `hours` |
| Menu or prices | `field_correction` | `menu` |
| Temporarily closed | `temporarily_closed` | — |
| Permanently closed | `permanently_closed` | — |
| Something else | `field_correction` | `other` |

For "Temporarily closed" and "Permanently closed", the suggested-value input is skipped — only the optional note is shown, since the type itself conveys the correction.

### States

| State | Behaviour |
|---|---|
| Submitting | Button spinner |
| Success | Confirmation toast: "Thanks — our team will review this." → `router.back()` |
| Duplicate (backend dedup) | Backend silently merges duplicate pending submissions — client shows the same success confirmation regardless |

### Analytics

- `edit_suggested` — fired on success, `properties: { branch_id, submission_type }`

### Not in MVP

- `place_missing` submission type does not have a dedicated mobile entry point at MVP — this is reachable only via a generic "Can't find a place?" link from the Discover empty state, deferred to Phase 3 polish if time allows. Not blocking for launch.
- Photo attachment to submissions
- Tracking submission status from the user's side

---

## 15. Business Claim Form

**Route:** `app/claim/[branchId].tsx`  
**Purpose:** Authenticated users claim ownership of a branch on behalf of a business.

### Data sources

```
POST /v1/branches/:id/claims   → useSubmitClaim(branchId)
GET  /v1/me/claims              → useOwnClaims()  (to check for existing claim before showing form)
```

### Pre-check

Before showing the form, check `useOwnClaims()` and the branch's claim status. If a claim already exists for this branch (from any user, `pending` or `verified`):

- If the existing claim belongs to the current user → show status instead of form: "Your claim is being reviewed" or "You're verified as the owner of this listing"
- If it belongs to another user → show: "A claim for this business is already being reviewed" (matches `CLAIM_ALREADY_PENDING` messaging) with no form

### Form

Uses `react-hook-form` + `zodResolver(claimFormSchema)`.

### Layout

```
┌─────────────────────────────────┐
│ [✕]      "Is this your business?"│
├─────────────────────────────────┤
│ Branch name (read-only context)  │
├─────────────────────────────────┤
│ "We'll contact you to verify"     │
│  (explanatory text — sets         │
│   expectation for manual review)  │
├─────────────────────────────────┤
│ Your name [text input]            │
│ Your role:                        │
│  ○ Owner  ○ Manager  ○ Marketing  │
│ Phone number [text input]         │
│ Email [text input]                │
│ Additional note (optional)        │
├─────────────────────────────────┤
│ [Submit claim]                    │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Existing claim (own, pending) | Shows status message, no form |
| Existing claim (own, verified) | Shows "You're verified" message, no form |
| Existing claim (other user) | Shows blocked message, no form |
| Validation error | Inline via React Hook Form |
| Submitting | Button spinner |
| `CLAIM_ALREADY_PENDING` (race condition — submitted after pre-check) | Error banner using `getErrorMessage()`, form remains for correction/retry context but submit is disabled |
| Success | Confirmation: "Thanks — we'll be in touch to verify your business." → `router.back()` |

### Analytics

- `claim_submitted` — fired on success, `properties: { branch_id }`

### Not in MVP

- Editing or withdrawing a submitted claim
- Status change notifications (user must check My Claims manually)

---

## 16. My Claims

**Route:** `app/profile/claims.tsx`  
**Purpose:** View status of submitted business claims.

### Data sources

```
GET /v1/me/claims   → useOwnClaims()
```

### Layout

```
┌─────────────────────────────────┐
│ [← back]    "My Claims"           │
├─────────────────────────────────┤
│ [claim card]                      │
│  Branch name                      │
│  Status: Pending / Verified /     │
│           Not approved             │
│  Submitted {date}                 │
├─────────────────────────────────┤
│ ...                                │
└─────────────────────────────────┘
```

### States

| State | Behaviour |
|---|---|
| Loading | Skeleton |
| Empty | Should not be reachable — this screen is only linked from Own Profile when claims exist |
| `rejected` status | Shown as "Not approved" — internal rejection reason not exposed |

### Interactions

- Tap a claim card → `router.push('/branch/[id]')` (view the branch)

### Not in MVP

- Re-submitting after rejection (user would need to use the claim form again from the branch page)
- Claim status push notifications

---

## Cross-Cutting Concerns

### Pull-to-refresh

Applied on: Home, Discover, Search Results, Collection, Saved Branches, Own Profile, Public Profile. Standard `RefreshControl` wrapping the `FlashList`/`ScrollView`, invalidates the relevant React Query key.

### Deep linking

Not in MVP scope per `04-mvp-feature-requirements.md`. Branch and collection routes are structured (`/branch/[id]`, `/collection/[slug]`) so deep linking can be enabled later without restructuring.

### Permissions

- **Photo library access** — requested only when the user taps "Add photos" on the Write Review screen (Screen 10), via `expo-image-picker`. Not requested at app launch.
- **Location** — not requested at MVP. No location-based features exist yet (nearby discovery is Phase 5).

### Offline behaviour

Not in MVP scope. React Query's default caching means previously-viewed screens may render stale data briefly when offline, but no explicit offline mode, queued actions, or offline indicators are built. A failed request while offline surfaces as a standard `ErrorScreen` via `getErrorMessage()`.

### Android back button

Handled automatically by Expo Router's stack navigation — back button pops the current route. No custom handling required except where a screen has unsaved form state (Write Review, Suggest an Edit, Claim Form) — these should confirm discard on back if the form is dirty, using `useFocusEffect` + `BackHandler` or a confirmation on `router.back()`.

