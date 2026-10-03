import { Alert } from "@/components/ui/alert";
import type { LookupItem } from "@/lib/api";

import type { PhotoCategory } from "./api";

// Asks what a photo shows, from the admin-edited list. Resolves with the
// pick, or null on Cancel.
export function askPhotoCategory(
  categories: readonly LookupItem[],
  current?: PhotoCategory,
): Promise<PhotoCategory | null> {
  return new Promise((resolve) => {
    Alert.alert("What's in this photo?", "It's shown as the photo's caption.", [
      ...categories.map((category) => ({
        text:
          category.key === current
            ? `${category.name} (current)`
            : category.name,
        onPress: () => resolve(category.key),
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
        onPress: () => resolve(null),
      },
    ]);
  });
}
