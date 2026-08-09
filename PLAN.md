# Bota — Product Plan

Living plan. New work must map to a phase below, or it goes in **NOT in v1** (or we
change the plan deliberately). This spans all three repos (mobile · backend · admin);
it lives here because mobile is the primary product surface.

**North star:** the fastest, most trustworthy way to find a great place to eat or
drink in Addis Ababa. Local, effortless, honest data.

**Current milestone:** Consumer Launch v1 — the discovery app genuinely ready for
real Addis users.

---

## Core loops

1. **Discover (no login).** Open → nearby/curated feed → tap a place. Browse-first;
   auth only at the moment of contribution.
2. **Decide.** rating · price · distance · open-now · photos · menu · reviews on the
   branch page.
3. **Contribute (gated at the action).** save · review · suggest edit · submit a place.
4. **Owner.** claim → verify → manage listing → reply to reviews.

## What "launch-ready" means (the bar for v1)

- Every core flow works signed-out and signed-in, on mid-range Android, on **real data**.
- No dead ends: every screen has loading / empty / error states.
- Data is **trustworthy**: submission → moderation → publish works end to end.
- The feed feels **alive** — real Addis places, photos, hours, prices (not seed demo).
- Basic instrumentation to learn post-launch.

## Current state (grounded, honest)

The core is **built**. v1 is hardening + content + polish + cutting scope — not new features.

- **Discover** — ✅ solid. Browse-first verified (UI + public API), home rails +
  highly-rated, search with filters, collections, location/distance/open-now, taste boost.
- **Decide** — ✅ solid. Branch page (photos, menu, hours, reviews, siblings), place page,
  reviews list. ⚠️ verify empty/error/loading states everywhere.
- **Contribute** — ✅ solid. Structured submissions (missing place + corrections) with
  dedupe + approve-to-draft; reviews (min 20 chars); review photos; saves.
- **Owner** — ✅ built. Claims + verification, manage listing (hours/menu/photos/logo),
  owner replies, business avatar. ⚠️ verification is manual (admin).
- **Moderation (admin)** — ✅ broad suite. ⚠️ verify approve→publish end-to-end.
- **Content / data** — ❌ biggest gap. Currently seed/demo. Real Addis catalog is a
  launch prerequisite (parallel track).
- **Hygiene** — ⚠️ dead code to remove (`(tabs)/test.tsx`, orphans), coherence sweep.

## Build order to v1

**Phase 0 — Launch-readiness audit (do before building).**
Walk every consumer flow signed-out + signed-in; log every gap (missing empty/error/
loading, dead ends). Dead-code + coherence sweep (remove `test.tsx`, orphaned
components, parallel patterns). **Done =** a written gap list; nothing half-built remains.

**Phase 1 — Harden the essential path.**
Fix every Phase-0 gap in home, search, branch page, review, save, sign-in-at-action.
Confirm moderation approve→publish works end to end (a submission becomes a live,
correct listing). **Done =** discover→decide→contribute is bulletproof on real data.

**Phase 2 — Content & trust.**
Load real Addis places/photos/hours/prices (seed real data and/or onboard via
submissions). Verify moderation throughput; enough content that the feed feels alive.
**Done =** a first-time user in Addis sees relevant, real, plentiful results.

**Phase 3 — Launch polish + instrumentation.**
Confirm onboarding posture (browse-first + completion checklist; no upfront primer).
Performance pass (mid Android), crash/error reporting, key analytics funnels. App-store
assets, legal, deep-link/push basics. **Done =** shippable build + we can measure
activation/retention.

## Explicitly NOT in v1 (parked — do not build now)

- Taste "For you" rail; taste **editor** UI (the current local boost stays as-is).
- Business profile beyond the avatar; subscriptions/billing; owner analytics dashboard.
- Place-level (chain) ownership + management grouping.
- Soft sign-in bottom sheets (hard nav to `/login` is fine for v1).
- Advanced personalization; notifications beyond meal reminders; menu-item photos at scale.
- Social (follow, public trust badges) beyond what exists.

## How we build (to stay coherent)

1. **One pattern per concern.** Extend the existing pattern or replace it — never leave
   two half-patterns side by side.
2. **No feature without its states + a "done" definition.** Loading/empty/error are part
   of the feature, not a follow-up.
3. **Delete as we go.** Removing dead code is part of the change, not "later."
4. **Anchored to this plan.** If new work doesn't map to a phase, it's parked or we
   revise the plan on purpose.
5. **Product principles hold:** browse-first · moderator-completes-the-listing ·
   structured-not-free-text · honest, trustworthy data.
