import { shadows } from "@/lib/theme";
import { Image } from "expo-image";
import { useRef } from "react";
import { View } from "react-native";
import { useReducedMotion } from "react-native-reanimated";

import { Photo, PhotoFallback } from "@/components/ui/photo";
import { FilledStar } from "@/components/ui/filled-star";
import { SaveHeartButton } from "@/components/ui/save-heart-button";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { formatMenuPriceRange } from "@/lib/price";
import { PressableScale } from "@/components/ui/pressable-scale";
import { openBadge } from "@/features/branch/hours";
import { usePrefetchBranch } from "@/features/branch/prefetch";
import { startPhotoFlight } from "@/features/branch/shared-photo";

type BranchCardProps = {
  branch: BranchCardData;
  isSaved: boolean;
  onToggleSave: (branch: BranchCardData) => void;
  onPress?: (branch: BranchCardData) => void;
  layout?: "portrait" | "wide";
};

export function BranchCard({
  branch,
  isSaved,
  onToggleSave,
  onPress,
  layout = "wide",
}: BranchCardProps) {
  const prefetchBranch = usePrefetchBranch();
  const reduced = useReducedMotion();
  const photoRef = useRef<View>(null);

  // Hand the cover's on-screen position to the place page, so the photo can
  // fly from here into its header. Reduce Motion (or no photo) just opens it.
  function open() {
    const uri = branch.coverPhotoUrl;
    if (reduced || !uri || !photoRef.current) {
      onPress?.(branch);
      return;
    }
    photoRef.current.measureInWindow((x, y, width, height) => {
      startPhotoFlight({
        branchId: branch.id,
        uri,
        from: { x, y, width, height },
        radius: 16,
      });
      onPress?.(branch);
    });
  }
  const badge = openBadge(branch);
  const subtitleParts = [branch.label, branch.neighborhood?.name].filter(
    (value): value is string => Boolean(value),
  );
  const subtitle = subtitleParts
    .filter(
      (value, index, values) =>
        values.findIndex(
          (candidate) => candidate.toLowerCase() === value.toLowerCase(),
        ) === index,
    )
    .join(" · ");

  const price = formatMenuPriceRange(branch.menuPriceRange);
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;
  // Area · distance on one line, e.g. "Piassa · 1.2 km".
  const locationLine = [subtitle, distance].filter(Boolean).join(" · ");

  const imageClass =
    layout === "portrait"
      ? "aspect-[4/5] rounded-2xl"
      : "aspect-[4/3] rounded-2xl";
  const textInset = layout === "portrait" ? 4 : 3;

  return (
    <PressableScale
      className="w-full"
      onPress={open}
      // Start loading the page (and its cover) as the finger lands.
      onPressIn={() => prefetchBranch(branch)}
    >
      <View
        className={`w-full overflow-hidden bg-placeholder ${imageClass}`}
        collapsable={false}
        ref={photoRef}
      >
        {branch.coverPhotoUrl ? (
          <Photo
            style={{ width: "100%", height: "100%" }}
            uri={branch.coverPhotoUrl}
          />
        ) : (
          <PhotoFallback iconSize={44} />
        )}

        {badge ? (
          <View className="absolute left-3 top-3 rounded-full bg-surface px-3 py-1">
            <ThemedText size="xs" tone={badge.tone} weight="medium">
              {badge.label}
            </ThemedText>
          </View>
        ) : null}

        <SaveHeartButton
          className="absolute right-3 top-3 size-12"
          isSaved={isSaved}
          onPress={() => onToggleSave(branch)}
          style={shadows.cardControl}
        />

        {branch.placeAvatarUrl ? (
          <View
            className="absolute bottom-3 left-3 size-11 overflow-hidden rounded-full border-2 border-surface bg-surface"
            style={shadows.cardControl}
          >
            <Image
              contentFit="cover"
              source={branch.placeAvatarUrl}
              style={{ width: "100%", height: "100%" }}
              transition={150}
            />
          </View>
        ) : null}
      </View>

      <View className="mt-3" style={{ paddingLeft: textInset }}>
        <ThemedText
          className="shrink"
          numberOfLines={1}
          size="lg"
          weight="semibold"
        >
          {branch.placeName}
        </ThemedText>
        {locationLine ? (
          <ThemedText numberOfLines={1} size="sm" tone="muted">
            {locationLine}
          </ThemedText>
        ) : null}

        <View className="mt-0.5 flex-row items-center gap-1.5">
          {hasRating ? (
            <View className="flex-row items-center gap-1">
              <FilledStar size={14} />
              <ThemedText size="sm" weight="medium">
                {Number(branch.rating).toFixed(1)}
              </ThemedText>
              <ThemedText size="sm" tone="muted">
                ({branch.reviewCount})
              </ThemedText>
            </View>
          ) : (
            <ThemedText size="sm" weight="medium">
              New
            </ThemedText>
          )}
          {price ? (
            <ThemedText
              className="flex-1"
              numberOfLines={1}
              size="sm"
              tone="muted"
            >
              {`· ${price}`}
            </ThemedText>
          ) : null}
        </View>
        {/* "For you" says why it picked this place. */}
        {branch.reason ? (
          <ThemedText
            className="mt-1"
            numberOfLines={2}
            size="xs"
            tone="brand"
            weight="medium"
          >
            {branch.reason}
          </ThemedText>
        ) : null}
      </View>
    </PressableScale>
  );
}
