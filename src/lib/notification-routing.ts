import { router } from "expo-router";

import { debugLog } from "@/lib/debug";

// The `data` payload carried by every Bota notification. `type` drives where a
// tap lands; the id fields are filled per type. Kept loose (Record) because the
// payload arrives over the wire from the server / scheduler.
export type NotificationData = {
  type?: NotificationType;
  branchId?: string;
  collectionSlug?: string;
} & Record<string, unknown>;

// One per launch scenario (1–10). The server sets these on the push payload.
export type NotificationType =
  | "review_reply" // 1 someone replied to your review
  | "edit_approved" // 2 your suggested edit was approved
  | "review_status" // 3 your review was approved / needs attention
  | "trusted_user" // 4 you're now a trusted user
  | "claim_approved" // 5 your business claim was approved
  | "owner_response" // 6 an owner responded to your feedback
  | "saved_place_update" // 7 a saved place added a location / reopened
  | "report_resolved" // 8 a reported issue was resolved
  | "mealtime_nearby" // 9 a saved place is open around mealtime
  | "new_collection"; // 10 a newly curated collection

/**
 * Send the user to the right screen for a tapped notification. Safe to call
 * once navigation is mounted (from the response listener / cold-start handler).
 */
export function routeFromNotification(data: NotificationData | undefined) {
  if (!data) return;

  switch (data.type) {
    // Anything anchored to a specific branch opens that branch.
    case "review_reply":
    case "edit_approved":
    case "owner_response":
    case "saved_place_update":
    case "report_resolved":
    case "mealtime_nearby":
      if (data.branchId) router.push(`/branch/${data.branchId}`);
      return;

    case "review_status":
      router.push("/profile/reviews");
      return;

    case "claim_approved":
      router.push("/profile/claims");
      return;

    case "trusted_user":
      router.push("/profile");
      return;

    case "new_collection":
      if (data.collectionSlug) {
        router.push(`/collection/${data.collectionSlug}`);
      }
      return;

    default:
      debugLog("notifications", "unhandled notification type", {
        type: data.type ?? null,
      });
  }
}
