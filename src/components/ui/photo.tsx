import { SpoonAndForkIcon } from "@hugeicons/core-free-icons";
import { Image, type ImageProps } from "expo-image";
import { Dimensions, PixelRatio, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { useColors } from "@/lib/theme";

// A tiny, blurred version of the same photo from its CDN (a few hundred bytes),
// shown instantly while the full image loads so cards never sit as flat grey
// boxes. Returns undefined for hosts we don't know how to transform.
export function blurPlaceholderUrl(url: string | null | undefined) {
  if (!url) return undefined;
  // Cloudinary: insert a transformation right after /upload/.
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", "/upload/w_32,q_30,e_blur:600/");
  }
  // Unsplash (imgix): override width/quality and add blur.
  if (url.includes("images.unsplash.com")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", "32");
      u.searchParams.set("q", "30");
      u.searchParams.set("blur", "60");
      return u.toString();
    } catch {
      return undefined;
    }
  }
  return undefined;
}

// Pixel widths we ask the CDN for. A few fixed steps rather than exact sizes,
// so the same file is reused across screens and stays in the image cache.
const WIDTH_STEPS = [160, 320, 640, 960, 1280];

/**
 * The photo at the smallest standard width that stays sharp when shown
 * `displayWidth` points wide on this screen. Unknown hosts are unchanged.
 */
export function sizedPhotoUrl(url: string, displayWidth?: number) {
  if (!displayWidth) return url;
  const px = displayWidth * PixelRatio.get();
  const w = WIDTH_STEPS.find((step) => step >= px) ?? WIDTH_STEPS.at(-1)!;
  if (url.includes("res.cloudinary.com") && url.includes("/upload/")) {
    return url.replace("/upload/", `/upload/w_${w},c_limit,f_auto,q_auto/`);
  }
  if (url.includes("images.unsplash.com")) {
    try {
      const u = new URL(url);
      u.searchParams.set("w", String(w));
      u.searchParams.set("q", "75");
      u.searchParams.set("auto", "format");
      return u.toString();
    } catch {
      return url;
    }
  }
  return url;
}

/** A place's cover at the size the place page's header shows it. */
export function heroPhotoUrl(url: string) {
  return sizedPhotoUrl(url, Dimensions.get("window").width);
}

// Photos of places: a blurred preview right away (from the photo's ThumbHash
// when the API sends one, else a tiny blurred copy from the CDN), then a short fade into the
// full image. Use for remote place/review photos, not icons or avatars.
export function Photo({
  uri,
  transition = 250,
  contentFit = "cover",
  displayWidth,
  thumbhash,
  ...props
}: Omit<ImageProps, "source" | "placeholder"> & {
  uri: string;
  /** Drawn instantly with no download; preferred over the blurred URL. */
  thumbhash?: string | null;
  /** How wide it's shown, in points; picks a right-sized download. */
  displayWidth?: number;
}) {
  const placeholder = blurPlaceholderUrl(uri);
  return (
    <Image
      {...props}
      contentFit={contentFit}
      placeholder={
        thumbhash
          ? { thumbhash }
          : placeholder
            ? { uri: placeholder }
            : undefined
      }
      placeholderContentFit="cover"
      source={{ uri: sizedPhotoUrl(uri, displayWidth) }}
      transition={transition}
    />
  );
}

// Shown where a place has no photo yet: a soft brand-tinted tile with the
// food glyph, so the card still looks intentional instead of an empty box.
export function PhotoFallback({ iconSize = 40 }: { iconSize?: number }) {
  const colors = useColors();
  return (
    <View className="size-full items-center justify-center bg-personalized">
      <AppIcon
        color={colors.primary}
        icon={SpoonAndForkIcon}
        size={iconSize}
        strokeWidth={1.5}
      />
    </View>
  );
}
