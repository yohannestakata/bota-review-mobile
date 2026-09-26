import * as ImagePicker from "expo-image-picker";
import { useCallback } from "react";

export type PickedImage = {
  uri: string;
  width: number;
  height: number;
  fileName?: string | null;
  mimeType?: string | null;
  base64?: string | null;
};

export type PickImageOptions = {
  multiple?: boolean;
  selectionLimit?: number;
  base64?: boolean;
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
};

export type PickImageResult =
  | { status: "denied" }
  | { status: "canceled" }
  | { status: "picked"; images: PickedImage[] };

type PhotoSourceHandler = (
  options: PickImageOptions,
) => Promise<PickImageResult>;

// Registered by the mounted PhotoSourceHost, which asks "camera or library?".
let sourceHandler: PhotoSourceHandler | null = null;

export function registerPhotoSource(handler: PhotoSourceHandler | null) {
  sourceHandler = handler;
}

// Library permission + launch + asset mapping.
export async function pickFromLibrary(
  options: PickImageOptions = {},
): Promise<PickImageResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { status: "denied" };

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsMultipleSelection: options.multiple ?? false,
    base64: options.base64 ?? false,
    mediaTypes: ["images"],
    quality: options.quality ?? 0.8,
    ...(options.selectionLimit
      ? { selectionLimit: options.selectionLimit }
      : {}),
    ...(options.allowsEditing ? { allowsEditing: true } : {}),
    ...(options.aspect ? { aspect: options.aspect } : {}),
  });
  if (result.canceled) return { status: "canceled" };

  return {
    status: "picked",
    images: result.assets.map((asset) => ({
      uri: asset.uri,
      width: asset.width,
      height: asset.height,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      base64: asset.base64,
    })),
  };
}

// One entry point for "add a photo": offers the in-app camera or the library
// (via the PhotoSourceHost), falling back to the library if no host is
// mounted. Callers decide how to surface "denied" and what to do with images.
export function usePickImage() {
  return useCallback(
    (options: PickImageOptions = {}): Promise<PickImageResult> =>
      sourceHandler ? sourceHandler(options) : pickFromLibrary(options),
    [],
  );
}
