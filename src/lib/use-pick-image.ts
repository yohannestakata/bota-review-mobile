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

type PickImageOptions = {
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

// One place for library-permission + launch + asset mapping. Callers decide how
// to surface "denied" (Alert vs inline error) and what to do with `images`.
export function usePickImage() {
  return useCallback(
    async (options: PickImageOptions = {}): Promise<PickImageResult> => {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
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
    },
    [],
  );
}
