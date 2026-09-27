import { shadows } from "@/lib/theme";
import { Image } from "expo-image";
import { View } from "react-native";

import { Photo, PhotoFallback } from "@/components/ui/photo";
import { FilledStar } from "@/components/ui/filled-star";
import { SaveHeartButton } from "@/components/ui/save-heart-button";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { formatMenuPriceRange } from "@/lib/price";
import { PressableScale } from "@/components/ui/pressable-scale";
import { openBadge } from "@/features/branch/hours";
import { usePrefetchBranch } from "@/features/branch/prefetch";

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
      onPress={() => onPress?.(branch)}
      // Start loading the page (and its cover) as the finger lands.
      onPressIn={() => prefetchBranch(branch)}
    >
      <View className={`w-full overflow-hidden bg-placeholder ${imageClass}`}>
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
      </View>
    </PressableScale>
  );
}
