# Bota Review — Mobile Launch Blockers & Work Tracker

**Created:** 2026-06-24
**Scope:** Everything between the current mobile build and a controlled launch (Phases 2–3).
**Source:** Cross-reference of `01-product-strategy.md`, `04-mvp-feature-requirements.md`, `06-mobile-screens.md`, `03-mobile-standards.md` against the implemented app in `mobile/src`.

Severity legend: 🔴 launch blocker · 🟠 required for spec compliance · 🟡 polish / nice-to-have
Status: ✅ done · ◐ partial · ☐ open. Last re-verified against code: 2026-06-24.

---

## ✅ Completed since first pass
- **Anonymous browsing** — `_layout.tsx:64-67` now continues with an anonymous session; signed-out users reach the tabs. Action gating (save → `/login`) is in place in `search.tsx`.
- **Discover sorts** — all 4 wired: `rating` (top rated) · `review_count` (most reviewed) · `recently_verified` · `newest` (newly added) (`features/search/api.ts:9`).
- **Neighborhood filter** — present (`search.tsx:42`, FilterSheet `onSelectNeighborhood`).
- **Default browse populates** — `useSearch` falls back to `browseBranches` → `/branches` when no query/filter (`features/search/queries.ts:66-73`).
- **Pull-to-refresh** — added on Home, Saved, Profile (still missing on Search & Collection — see item 10).

---

## P0 — Launch Blockers (must fix before any release)

### 1. ✅ Anonymous browsing — DONE
Fixed in `mobile/src/app/(tabs)/_layout.tsx:64-67`. Verify the remaining sub-points still hold:
  - [x] Signed-out users reach Home, Search, Branch Detail, Collection.
  - [x] Save action prompts sign-in (`search.tsx onToggleSave` → `/login`).
  - [ ] Confirm Write-review, Claim, Suggest-edit all gate the *action* (not the screen) and return to it after sign-in.
  - [ ] Saved + Profile tabs show a sign-in *prompt state* (not a redirect) when signed out.

### 2. ✅ Analytics events (Phase 2 exit condition) — DONE
- **Spec:** `04-mvp-feature-requirements.md` Feature 13; Phase 2 exit = "analytics firing."
- **Implemented:**
  - [x] PostHog RN SDK added (`posthog-react-native` + Expo peers); `AnalyticsProvider` (`components/analytics-provider.tsx`) wraps the app, identifies on Clerk sign-in, resets on sign-out.
  - [x] Unified `analytics.track()` (`lib/analytics.ts`) fans out to PostHog **and** a batched internal-table client (`POST /analytics/events`, ≤20/batch, per-launch `session_id`, fire-and-forget, drains on background, promotes `branch_id` → top-level uuid).
  - [x] All 15 events wired: `search_submitted` + `search_no_results` + `filter_applied` (search.tsx) · `collection_viewed` (collection) · `branch_viewed` (+`source` from home/search/saved/collection) + `menu_viewed` (branch detail) · `directions_clicked`/`phone_clicked`/`share_clicked` (quick-actions) · `branch_saved`/`branch_unsaved` (all save sites) · `review_started`/`review_submitted` (review) · `edit_suggested` (suggest-edit) · `claim_submitted` (claim).
  - [x] Typecheck + lint clean.
  - Note (partial, non-blocking): `collection_viewed` fires when the collection screen opens, not on home-rail scroll-into-view; `branch_viewed.source` defaults to `"unknown"` for nav paths without an explicit source (e.g. sibling cards).
  - [ ] **Verify in PostHog** that events land on a device/emulator run (key `phc_lwq…`, US Cloud).

---

## P1 — Required for Spec Compliance

### 3. ✅ Discover — DONE (one doc decision left)
- **Spec:** `06-mobile-screens.md` Screen 2 (Discover) + Screen 3 (Search) are distinct. Browse must work with no query.
- **Tasks (mobile):**
  - [x] Browse populated by default via `/branches` (`useSearch` `isBrowse` path).
  - [x] Neighborhood filter (single-select).
  - [x] Sort options: top rated · most reviewed · recently verified · newly added.
  - [x] **Pagination / load-more** — `useSearch` is a `useInfiniteQuery` (PAGE_SIZE 20); list `onEndReached` → `fetchNextPage` with guards, footer spinner + "couldn't load more" retry, and pull-to-refresh. Stop condition: last page `< PAGE_SIZE`.
  - [x] Active filter chips with individual ✕ removal (neighborhood/cuisine/tag/price) above the results.
  - [x] Empty-state copy distinguishes no-inventory (`!active`) vs nothing-matched.
  - [ ] Decide: restore a separate Discover tab, or formally document the merged Search+Discover deviation. *(doc-only, non-blocking)*
- **Backend (verified already supported — note was stale):**
  - [x] `/branches` is page-based (`page`/`limit`, returns `X-Total-Count`) with `neighborhoodId`/`cuisineId`/`q`/`placeId`.
  - [x] `/search` supports `cuisineId[]`, `tagId[]`, `priceLevel[]`, `openNow`, `lat`/`lng`, `sort` (rating·review_count·recently_verified·newest·distance), `limit` (≤50), `offset` (≤5000).

### 4. ✅ Missing required screens — DONE
- **Spec:** `06-mobile-screens.md` Screen Inventory (line 26).
  - [x] **Place Overview** — `app/place/[id].tsx` via `GET /v1/places/:id`, reachable from the branch sibling rail.
  - [x] **Public Profile** — `app/profile/[id].tsx` via `GET /v1/users/:id/profile` + `/users/:id/reviews`; reviewer names and avatars link to it.
  - [x] **My Claims** — `app/profile/claims.tsx` via `useOwnClaims` → `GET /me/claims`; status-coloured cards, tap → branch. Linked from Own Profile via a "My Claims (N)" row shown only when claims exist.
  - [x] **Photo Gallery** — dedicated `app/branch/[id]/photos.tsx`: paged swipe + pinch-zoom (shared `ZoomableImage` extracted from the modal viewer) + photo count badge + category label + tappable thumbnail strip. Branch detail cover/strip now `router.push` to it; the inline `PhotoViewer` modal is retained only for review photos.

### 5. ✅ Review flow gaps — DONE
- **Spec:** `04-mvp-feature-requirements.md` Feature 4; `06-mobile-screens.md` Screen 10.
- **File:** `mobile/src/app/review/[branchId].tsx`, `features/branch/*`
  - [x] Cap review photos at **3** (`MAX_PHOTOS = 3`).
  - [x] Optional **visit date** field (date picker, `maximumDate` = today, stored ISO; sent on create + edit). Added `@react-native-community/datetimepicker`.
  - [x] **Review reporting** UI — wired on branch detail, all-reviews, and Public Profile via `useReportReview` → `POST /reviews/:id/reports` (sign-in gated; own reviews are hidden client-side and rejected by the backend).
  - [x] Edit mode **fetches by ID** (`useReview` → `GET /reviews/:id`) and hydrates the form via `reset()`; route params are now only instant placeholders.
  - [x] On `REVIEW_ALREADY_EXISTS` (409): look up the user's existing review via `/me/reviews` and offer to edit it (`router.replace` to edit mode).
  - [x] Failed photo registration cleans up Cloudinary (`deleteCloudinaryPhoto` → `DELETE /photos/cloudinary/:publicId`) before rethrowing.
  - [x] Unsaved-changes confirm via shared `useDiscardConfirm` hook (✕ button + Android hardware back) on **Write Review, Suggest Edit, and Claim**.
  - Infra: `lib/api.ts` now surfaces the backend error `code`/`fields` (`ApiError`, `getErrorCode`, `getErrorMessage`).

### 6. ✅ Claims half-integrated — DONE
- **File:** `mobile/src/app/claim/[branchId].tsx`, `features/branch/*`
  - [x] Pre-check existing claim via `useOwnClaims` → `GET /me/claims`; shows a status screen (under review / verified) instead of the form when an own pending/verified claim exists. Other-user claims are caught on submit (no public endpoint exposes them pre-submit).
  - [x] Remove "manage your listing" copy on branch detail → "Claim it to verify ownership and get a verified badge."
  - [x] Handle `CLAIM_ALREADY_PENDING` with a clear message ("A claim for this business is already being reviewed.").
  - [x] **My Claims screen + Own Profile shortcut** — `app/profile/claims.tsx` + the "My Claims (N)" row on Own Profile (see item 4).

### 7. ✅ Profile Edit — KEEP (decided 2026-06-24)
- **File:** `mobile/src/app/profile/edit.tsx`
- **Original concern:** spec lists user-editable profile under Phase 5, and the screen first appeared unwired.
- **Resolution:** the screen now saves directly via the **Clerk SDK** (`user.update` + `user.setProfileImage`), which syncs to the Bota DB through the `user.updated` webhook. It builds **no** Bota-side profile-editing machinery — it uses Clerk, which the spec already treats as the identity owner. Decision: **keep it** as an intentional, in-scope feature. No action.

---

## P2 — Cross-Cutting Standards & Quality

### 8. ✅ FlashList, not FlatList — DONE
- **Spec:** `03-mobile-standards.md` line 733 — "Use `FlashList`, never `FlatList`."
- [x] Added `@shopify/flash-list` v2 + a NativeWind-interop wrapper (`components/ui/flash-list.tsx`) so `contentContainerClassName` keeps working.
- [x] Migrated all vertical card/review lists: collection, search, saved, profile, claims, public profile, place, all-reviews.
- Intentionally left on `FlatList`: the two **horizontal full-screen photo pagers** (`photo-viewer.tsx`, `branch/[id]/photos.tsx`) — paged carousels using `getItemLayout`, bounded ≤30 items, not the long-list case the standard targets.

### 9. ✅ Filter UI → gorhom BottomSheet — DONE
- **Spec:** `03-mobile-standards.md` lines 27 & 800.
- **Important correction:** `@expo/ui/community/bottom-sheet` is NOT gorhom — on Android it's a native Material3 `ModalBottomSheet` hosting a plain RN `ScrollView`, and the native drag fought the RN scroll (content scrolled then rubber-banded back). Switched to **`@gorhom/bottom-sheet` directly**, whose `BottomSheetScrollView` coordinates scroll-vs-drag.
- [x] `@gorhom/bottom-sheet` installed; root wiring `GestureHandlerRootView` (outermost) + gorhom `BottomSheetModalProvider` in `app/_layout.tsx`.
- [x] `filter-sheet.tsx` on gorhom `BottomSheetModal` + `BottomSheetScrollView`, with `BottomSheetBackdrop` (tap-to-close) + sticky `BottomSheetFooter` ("Show results"). Same `visible`/`onClose` interface; themed `FilterChip`/`ThemedText` UI preserved.
- gorhom is pure-JS over reanimated/gesture-handler (already native) → works on a Metro reload, no rebuild needed.

### 10. ✅ Pull-to-refresh — DONE (pagination already unified — see item 3)
- **Spec:** `06-mobile-screens.md` Cross-Cutting.
  - [x] Pull-to-refresh on Home, Saved, Own Profile, **Search**, **Collection**, **Public Profile**, Place, My Claims.
  - [x] Pagination unified via `useInfiniteQuery` (search/browse) — see item 3. Reviews/saves use single-page list endpoints by design.

### 11. 🟠 Authenticated end-to-end test coverage
  - [ ] At least one signed-in E2E flow (sign in → save / write review → verify) and one anonymous browse flow.

---

## Device Verification Checklist (handoff 2026-06-24)
Feature backlog is cleared; remaining work is on-device verification.

### Build first (native modules were added this cycle)
A JS reload is NOT enough — make a fresh dev-client build:
```
cd mobile
npx eas-cli@latest integrations:posthog:connect --region US --no-session-replay   # one-time, optional but recommended
pnpm exec expo prebuild        # if using prebuild workflow
pnpm exec expo run:ios         # and/or run:android  (or an EAS dev build)
```
Native deps added: `@shopify/flash-list`, `@react-native-community/datetimepicker`, `posthog-react-native`. (gorhom/reanimated/gesture-handler were already native — sheet works on JS reload.)

### Verify
- [ ] **Analytics** — events land in PostHog (project 210335, US). Check `branch_viewed`, `search_submitted`, `filter_applied`, `branch_saved`, `review_submitted`. Internal table: `POST /v1/analytics/events` 2xx.
- [ ] **Filter sheet** — opens on tap (iOS + Android), scrolls without bounce, backdrop/swipe/"Show results" dismiss, 28px top radius.
- [ ] **Lists** — FlashLists scroll smoothly; item gaps + header→first-item gaps look right on search, saved, collection, profile, public profile, place, claims, reviews.
- [ ] **Review flow** — 3-photo cap, visit-date picker (max today), "⋯" → report confirm, edit pre-fills via fetch, `REVIEW_ALREADY_EXISTS` routes to edit, discard-confirm on dirty back.
- [ ] **Claims** — pre-check status screen vs form; My Claims from profile.
- [ ] **Anonymous** — browse Home/Search/Branch/Collection signed-out; Save/review/claim prompt sign-in and return.
- [ ] **Screens** — Place Overview, Public Profile, Photo Gallery (count/category/thumbnails), My Claims.

### Open decisions / non-blocking
- [ ] Keep merged Search+Discover tab, or split per `06-mobile-screens.md`.
- [ ] Backend deps audit (commit-don't-push) — `/branches` + `/search` already verified live.
- [ ] E2E test coverage (item 11) — deferred.

---

## Backend Dependencies (commit-but-don't-push)
Tracked separately because the mobile fixes depend on them:
- [ ] `GET /v1/branches` filters + sorts + `X-Total-Count` (item 3).
- [ ] Confirm `GET /v1/me/claims`, `GET /v1/users/:id/profile`, `GET /v1/users/:id/reviews`, `GET /v1/reviews/:id`, `POST /v1/reviews/:id/reports`, `DELETE /v1/photos/cloudinary/:publicId`, `POST /v1/analytics/events` are all live and match the contract.

---

## Suggested Sequencing
1. **Anonymous browsing** (item 1) — unblocks everything else and is the core product promise.
2. **Backend `/branches` filters/sorts** (item 3 backend) — unblocks Discover.
3. **Discover** (item 3 mobile) + **FlashList/BottomSheet/pagination** (items 8–10) — same surface, do together.
4. **Analytics** (item 2) — closes the Phase 2 exit gate.
5. **Review flow** (item 5) + **Claims/My Claims/Public Profile/Place Overview** (items 4, 6) + **Profile-edit removal** (item 7).
6. **Photo gallery** (item 4) + **E2E tests** (item 11).
