import { AppState } from "react-native";
import type { PostHog } from "posthog-react-native";

import { apiFetch, type TokenGetter } from "@/lib/api";
import { debugLog } from "@/lib/debug";

// Two analytics layers, per 04-mvp-feature-requirements.md Feature 13:
//   1. PostHog — product analytics (funnels, retention). Fed via this SDK.
//   2. Internal table — operational analytics via POST /v1/analytics/events.
// Every track() call fans out to both. Both layers are fire-and-forget: a
// failure in either never surfaces to the UI or blocks the caller.

// The exact event catalogue the mobile app fires. Property keys match the
// spec's snake_case contract so PostHog and the internal table agree.
export type AnalyticsEvents = {
  search_submitted: { query: string; result_count: number };
  search_no_results: { query: string; filters: Record<string, unknown> };
  filter_applied: { filter_type: string; filter_value: string | number };
  collection_viewed: { collection_slug: string };
  branch_viewed: { branch_id: string; source: string };
  menu_viewed: { branch_id: string };
  directions_clicked: { branch_id: string };
  phone_clicked: { branch_id: string };
  branch_saved: { branch_id: string };
  branch_unsaved: { branch_id: string };
  share_clicked: { branch_id: string };
  review_started: { branch_id: string };
  review_submitted: { branch_id: string; rating: number };
  edit_suggested: { branch_id: string; submission_type: string };
  claim_submitted: { branch_id: string };
};

export type AnalyticsEventName = keyof AnalyticsEvents;

type QueuedEvent = {
  name: string;
  branchId?: string;
  sessionId: string;
  properties: Record<string, unknown>;
};

const MAX_BATCH = 20; // Backend caps a batch at 20 events.
const FLUSH_INTERVAL_MS = 4000;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// One session id per app launch, kept in memory only (per product decision).
function createSessionId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

class Analytics {
  private posthog: PostHog | null = null;
  private getToken: TokenGetter = async () => null;
  private readonly sessionId = createSessionId();
  private queue: QueuedEvent[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private appStateBound = false;

  setClient(posthog: PostHog | null) {
    this.posthog = posthog;
  }

  // The bridge keeps this fresh so the internal endpoint can resolve the user
  // from a Clerk token when one exists (events still fire when anonymous).
  setTokenGetter(getToken: TokenGetter) {
    this.getToken = getToken;
  }

  identify(
    distinctId: string,
    properties?: Parameters<PostHog["identify"]>[1],
  ) {
    try {
      this.posthog?.identify(distinctId, properties);
    } catch {
      // never throw from analytics
    }
  }

  reset() {
    try {
      this.posthog?.reset();
    } catch {
      // never throw from analytics
    }
  }

  track = <E extends AnalyticsEventName>(
    name: E,
    properties: AnalyticsEvents[E],
  ): void => {
    const props = { ...(properties as Record<string, unknown>) };

    // PostHog layer
    try {
      this.posthog?.capture(name, { ...props, session_id: this.sessionId });
    } catch {
      debugLog("analytics", "posthog capture failed", { name });
    }

    // Internal-table layer — branch_id is promoted to the top-level uuid field
    // the backend DTO expects, and left in properties for parity.
    const rawBranchId = props.branch_id;
    const branchId =
      typeof rawBranchId === "string" && UUID_RE.test(rawBranchId)
        ? rawBranchId
        : undefined;

    this.queue.push({
      name,
      branchId,
      sessionId: this.sessionId,
      properties: props,
    });
    this.bindAppState();

    if (this.queue.length >= MAX_BATCH) {
      void this.flush();
    } else {
      this.scheduleFlush();
    }
  };

  private scheduleFlush() {
    if (this.flushTimer) {
      return;
    }
    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, FLUSH_INTERVAL_MS);
  }

  // Drain on backgrounding so queued events aren't lost when the user leaves.
  private bindAppState() {
    if (this.appStateBound) {
      return;
    }
    this.appStateBound = true;
    AppState.addEventListener("change", (state) => {
      if (state !== "active") {
        void this.flush();
      }
    });
  }

  async flush(): Promise<void> {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.queue.length === 0) {
      return;
    }

    const batch = this.queue.splice(0, MAX_BATCH);
    try {
      await apiFetch("/analytics/events", this.getToken, {
        method: "POST",
        body: JSON.stringify({ events: batch }),
      });
    } catch (error) {
      // Fire-and-forget: drop the batch on failure, never resurface it.
      debugLog("analytics", "internal flush failed", {
        count: batch.length,
        message: error instanceof Error ? error.message : "unknown",
      });
    }

    // Keep draining bursts larger than one batch.
    if (this.queue.length > 0) {
      this.scheduleFlush();
    }
  }
}

export const analytics = new Analytics();

// Convenience hook for screens/components — `track` is stable across renders.
export function useAnalytics() {
  return analytics;
}
