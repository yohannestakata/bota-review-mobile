import { useAuth } from "@clerk/clerk-expo";
import { router } from "expo-router";
import { useCallback } from "react";

import { analytics } from "@/lib/analytics";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { promptAndRegisterPush } from "@/lib/push-registration";

import { useSavedBranchIds, useToggleSave } from "./queries";

const EMPTY_SAVED = new Set<string>();

// Shared save-toggle for any card list: signed-out → login, else optimistic
// toggle + analytics. Returns the resolved saved-id set and the underlying
// query (for refresh state).
export function useSaveHandler() {
  const { isSignedIn, getToken } = useAuth();
  const saved = useSavedBranchIds();
  const toggleSave = useToggleSave();
  const savedIds = saved.data ?? EMPTY_SAVED;

  const onToggleSave = useCallback(
    (branch: BranchCardData) => {
      if (!isSignedIn) {
        router.push("/login");
        return;
      }
      const wasSaved = savedIds.has(branch.id);
      analytics.track(wasSaved ? "branch_unsaved" : "branch_saved", {
        branch_id: branch.id,
      });
      toggleSave.mutate({ branchId: branch.id, isSaved: wasSaved });
      // Saving is a meaningful action — a good moment to ask about push (once).
      if (!wasSaved) {
        void promptAndRegisterPush(getToken);
      }
    },
    [getToken, isSignedIn, savedIds, toggleSave],
  );

  return { saved, savedIds, onToggleSave };
}
