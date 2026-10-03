import { Alert } from "@/components/ui/alert";

import { PHOTO_CATEGORIES, type PhotoCategory } from "./api";

// Asks what a photo shows. Resolves with the pick, or null on Cancel.
export function askPhotoCategory(
  current?: PhotoCategory,
): Promise<PhotoCategory | null> {
  return new Promise((resolve) => {
    Alert.alert("What's in this photo?", "It's shown as the photo's caption.", [
      ...PHOTO_CATEGORIES.map((category) => ({
        text:
          category.value === current
            ? `${category.label} (current)`
            : category.label,
        onPress: () => resolve(category.value),
      })),
      {
        text: "Cancel",
        style: "cancel" as const,
        onPress: () => resolve(null),
      },
    ]);
  });
}
