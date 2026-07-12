# Launch-Readiness Gap List (Phase 0 output)

From a read-only audit of the consumer surface (4 parallel passes). Working
checklist for Phase 1. **No hard app-breaking blockers were found** — the core
flows work signed-out and signed-in. The items below are hardening, coherence,
and a few dead ends. Fix the **Systemic** section first: each resolves many
screens and directly de-drifts the codebase.

Severity: **SHOULD** = fix for v1 · **NICE** = polish/defer.

---

## A. Systemic (do first — one fix, many screens) — ✅ DONE

_All six landed (+ test.tsx from Section C): a5fa33e, b4711fb, 6b2e1d6, 7e0ec3b,
ae7a998, a85e3fd, f3bf604._

- [ ] **Masked errors → one list pattern.** A load *failure* is rendered as an
      empty state with no retry in: `menu/[branchId].tsx:52`, `reviews/[branchId].tsx:79`,
      `profile/claims.tsx:45`, `profile/reviews.tsx:65`, `profile/replies.tsx:143`.
      `(tabs)/saved.tsx` does it right — standardize all on that (isError → message + retry). · SHOULD
- [ ] **Unify taxonomy hooks.** `useCuisines`/`useNeighborhoods`/`useTags` exist twice
      with **mismatched cache keys** → same data fetched/cached twice.
      `features/search/queries.ts` (namespaced keys) vs `features/submissions/queries.ts`
      (flat keys). Consolidate to one module + one key convention; delete the dupes;
      fix the barrels. Also dedupe `getCuisines`/`getTags` (`features/search/api.ts` → `lib/api.ts`). · SHOULD
- [ ] **Extract `useSaveHandler()`.** `onToggleSave` + `EMPTY_SAVED` is byte-duplicated in
      `(tabs)/index.tsx:65`, `(tabs)/search.tsx`, `collection/[slug].tsx` (incl. analytics + login redirect). · SHOULD
- [ ] **Extract `usePickImage()`.** Image-pick permission+launch duplicated in 5 places with
      divergent quality/handling: `manage.tsx:238,272`, `profile/edit.tsx:72`,
      `review/[branchId].tsx:142`, `menu-field.tsx:134`, `photo-field.tsx:38`. · SHOULD
- [ ] **Promote `ScreenHeader`** (CloseButton + title + spacer) to `components/ui`; re-inlined in
      ~7 screens (manage, photos, suggest-edit, profile/notifications, profile/edit, profile/reviews, review). · SHOULD
- [ ] **Import shared `getErrorMessage`** from `@/lib/api`; delete 4 inline copies
      (`submissions.tsx:38`, `suggest-edit:159`, `review:74`, `claim:127`). · SHOULD

## B. Screen gaps — missing states / dead ends / correctness

- [x] `collection/[slug].tsx:76` — zero-branch collection renders a blank list (dead end). Add empty state. · SHOULD → `c32f520`
- [x] `branch/[id]/photos.tsx:35` — no loading/error/empty; deep-link → black void. Add all three. · SHOULD → `bdbafb3`
- [x] `(tabs)/submissions.tsx:457` — invalid `contactEmail` (in a collapsed section) silently disables submit. Surface the error / auto-expand. · SHOULD → `e4b0bdb`
- [x] `suggest-edit/[branchId].tsx:171` — branch/taxonomy queries have no load-error state; pickers render empty with no explanation. · SHOULD → `f27c671`
- [x] `branch/[id].tsx:232` — hero uses `photos[0]` but rail filters on `isCover`; non-cover first photo desyncs hero/rail. Derive cover from `find(isCover) ?? [0]`. · SHOULD → `366b3e7`
- [ ] `(tabs)/index.tsx:91` — collection nav falls back to `title` when `slug` missing → `/collection/<Title>` 404s. Drop slugless collections. · SHOULD — DEFERRED (index.tsx is active taste work)
- [x] `review/[branchId].tsx:119` — edit: `useReview` error unsurfaced; `reset()` on slow fetch can clobber typing; save can overwrite with stale text. Guard hydrate + show error. · SHOULD → `28f7b04`
- [x] `profile/reviews.tsx:38` — `deleteReview` has no `onError`; failed delete is silent. Add Alert. · SHOULD → `c32f520`
- [ ] `(tabs)/index.tsx:187` / `search.tsx:322` — failed refetch with stale cache shows old data, no error banner. · NICE
- [ ] `(tabs)/profile.tsx:119` — counts flash `0` while `useMe`/reviews/claims load. · NICE
- [ ] `search.tsx:96` — `nearby` chip can stay active after location revoked while sort silently falls back. · NICE
- [ ] `claim/[branchId].tsx:214` — `business_email` evidence not validated as an email. · NICE

## C. Dead code / hygiene

- [ ] **Delete `(tabs)/test.tsx`** (typography scratch screen) + its `Tabs.Screen` line in `(tabs)/_layout.tsx:202`. Still route-reachable. · SHOULD
- [ ] Extract a `ChipGroup` wrapper (`flex-row flex-wrap gap-2` + map of `ChipButton`) — re-invented in manage/filter-sheet/suggest-edit/submissions. · NICE
- [ ] One shared `SectionTitle` (defined twice, different prop shapes: `branch/[id].tsx:66` vs `manage.tsx:91`). · NICE
- [ ] `amenity-list.tsx:19` — import canonical `Amenity` from `lib/api` instead of a local type. · NICE
- [ ] Prune unused deps (verify first): `@expo/ui`, `expo-glass-effect`, `expo-symbols`, `react-native-shadow-2`, `expo-file-system` (+ maybe `expo-device`/`expo-application`). · NICE

## D. Polish (decide in/out for v1)

- [ ] `AuthRequiredScreen` — add a "Create account" path (CTA is bare "Sign in"). · NICE
- [ ] `profile/edit.tsx` — disable Save during account deletion; add discard-confirm on close; avatar permission message. · NICE
- [ ] `profile/replies.tsx:20` — label pending replies "Under review", not "Posted". · NICE
- [ ] `quick-actions.tsx:44` / share — include a branch deep-link in the share message. · NICE
- [ ] `search.tsx:339` — no-results copy assumes filters even for plain text queries. · NICE

---

### Suggested Phase-1 order
1. **Section A (systemic)** — biggest coherence win; fixes bugs *and* removes drift.
2. **Section B SHOULDs** — close the dead ends + correctness bugs.
3. **`test.tsx` deletion** (do with A).
4. Triage **C/D NICE** — pick the few worth v1, park the rest (they're already in PLAN's "NOT in v1" spirit).
