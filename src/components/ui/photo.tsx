import { Image, type ImageProps } from "expo-image";

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

// Photos of places: a blurred preview right away, then a short fade into the
// full image. Use for remote place/review photos, not icons or avatars.
export function Photo({
  uri,
  transition = 250,
  contentFit = "cover",
  ...props
}: Omit<ImageProps, "source" | "placeholder"> & { uri: string }) {
  const placeholder = blurPlaceholderUrl(uri);
  return (
    <Image
      {...props}
      contentFit={contentFit}
      placeholder={placeholder ? { uri: placeholder } : undefined}
      placeholderContentFit="cover"
      source={{ uri }}
      transition={transition}
    />
  );
}
