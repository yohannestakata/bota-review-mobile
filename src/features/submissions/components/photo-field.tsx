import { useAuth } from "@clerk/clerk-expo";
import { useState } from "react";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { PhotoGrid } from "@/features/branch";
import type { PickedPhoto } from "@/features/branch/api";
import { usePickImage } from "@/lib/use-pick-image";

import { uploadSubmissionPhoto, type SubmissionPhoto } from "../api";

const MAX_PHOTOS = 3;

// Optional photo contribution shown as the same square grid as the review
// composer. Each pick uploads straight to Cloudinary; the refs ride along in the
// submission and land as pending photos the moderator approves on review.
export function PhotoField({
  value,
  onChange,
}: {
  value: SubmissionPhoto[];
  onChange: (value: SubmissionPhoto[]) => void;
}) {
  const { getToken } = useAuth();
  const pickImage = usePickImage();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // PhotoGrid renders PickedPhoto[]; expo-image loads the Cloudinary url as the
  // cell source, and removal keys off that same url.
  const gridPhotos: PickedPhoto[] = value.map((photo) => ({
    uri: photo.url,
    width: photo.width,
    height: photo.height,
  }));

  async function add() {
    setError(null);
    const result = await pickImage({
      multiple: true,
      base64: true,
      selectionLimit: MAX_PHOTOS - value.length,
    });
    if (result.status === "denied") {
      setError("Photo access is off. Turn it on in Settings to add one.");
      return;
    }
    if (result.status !== "picked") return;

    setBusy(true);
    try {
      const uploaded: SubmissionPhoto[] = [];
      for (const image of result.images) {
        uploaded.push(await uploadSubmissionPhoto(image, getToken));
      }
      onChange([...value, ...uploaded].slice(0, MAX_PHOTOS));
    } catch {
      setError("Upload failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function remove(uri: string) {
    onChange(value.filter((photo) => photo.url !== uri));
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Photos
      </ThemedText>
      <PhotoGrid
        adding={busy}
        canAdd={value.length < MAX_PHOTOS && !busy}
        onAdd={add}
        onRemove={remove}
        photos={gridPhotos}
      />
      {error ? (
        <ThemedText size="sm" tone="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}
