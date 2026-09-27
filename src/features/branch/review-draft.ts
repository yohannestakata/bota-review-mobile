import { Directory, File, Paths } from "expo-file-system";

import { debugLog } from "@/lib/debug";

import type { PickedPhoto } from "./api";

// Unfinished new reviews, kept on the device per user + place so leaving the
// screen (or the app) never loses what someone wrote. Photos are stored by file
// location only; their data is re-read when the draft is restored, and photos
// the OS has since cleaned up are skipped. All failures are logged and
// swallowed — a draft is a convenience, never a blocker.

export type ReviewDraft = {
  rating: number;
  text: string;
  visitDate?: string;
  photos: Omit<PickedPhoto, "base64">[];
  savedAt: number;
};

const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

function draftFile(userId: string, branchId: string) {
  const dir = new Directory(Paths.document, "review-drafts");
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  // File names allow only safe characters.
  const safe = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, "");
  return new File(dir, `${safe(userId)}_${safe(branchId)}.json`);
}

export function hasDraftContent(d: {
  rating: number;
  text: string;
  visitDate?: string;
  photos: unknown[];
}) {
  return (
    d.rating > 0 ||
    d.text.trim().length > 0 ||
    !!d.visitDate ||
    d.photos.length > 0
  );
}

export async function loadReviewDraft(
  userId: string,
  branchId: string,
): Promise<{ draft: ReviewDraft; photos: PickedPhoto[] } | null> {
  try {
    const file = draftFile(userId, branchId);
    if (!file.exists) return null;
    const draft = JSON.parse(await file.text()) as ReviewDraft;
    if (Date.now() - draft.savedAt > MAX_AGE_MS) {
      file.delete();
      return null;
    }
    // Re-read each photo's data for upload; drop any that no longer exist.
    const restored = await Promise.all(
      draft.photos.map(async (photo): Promise<PickedPhoto | null> => {
        try {
          const source = new File(photo.uri);
          if (!source.exists) return null;
          return { ...photo, base64: await source.base64() };
        } catch {
          return null;
        }
      }),
    );
    const photos = restored.filter((p): p is PickedPhoto => p !== null);
    return { draft, photos };
  } catch (error) {
    debugLog("review-draft", "load failed", { error: String(error) });
    return null;
  }
}

export function saveReviewDraft(
  userId: string,
  branchId: string,
  draft: Omit<ReviewDraft, "savedAt">,
) {
  try {
    const file = draftFile(userId, branchId);
    if (!hasDraftContent(draft)) {
      if (file.exists) file.delete();
      return;
    }
    const photos = draft.photos.map(
      ({ uri, width, height, fileName, mimeType }) => ({
        uri,
        width,
        height,
        fileName,
        mimeType,
      }),
    );
    file.write(JSON.stringify({ ...draft, photos, savedAt: Date.now() }));
  } catch (error) {
    debugLog("review-draft", "save failed", { error: String(error) });
  }
}

export function clearReviewDraft(userId: string, branchId: string) {
  try {
    const file = draftFile(userId, branchId);
    if (file.exists) file.delete();
  } catch (error) {
    debugLog("review-draft", "clear failed", { error: String(error) });
  }
}
