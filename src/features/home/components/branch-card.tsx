import { SparklesIcon } from "@hugeicons/core-free-icons";
import { shadows, useColors } from "@/lib/theme";
import { Image } from "expo-image";
import { useWindowDimensions, View } from "react-native";

import { Photo, PhotoFallback } from "@/components/ui/photo";
import { FilledStar } from "@/components/ui/filled-star";
import { SaveHeartButton } from "@/components/ui/save-heart-button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { formatMenuPriceRange } from "@/lib/price";
import { PressableScale } from "@/components/ui/pressable-scale";
import { openBadge } from "@/features/branch/hours";
import { usePrefetchBranch } from "@/features/branch/prefetch";
import { usePhotoFlight } from "@/features/branch/shared-photo";

type BranchCardProps = {
  branch: BranchCardData;
  isSaved: boolean;
  onToggleSave: (branch: BranchCardData) => void;
  onPress?: (branch: BranchCardData) => void;
  layout?: "portrait" | "wide";
};

/** Width / height of rail card covers (3:4, a portrait phone photo). */
export const CARD_PORTRAIT_RATIO = 3 / 4;

export function BranchCard({
  branch,
  isSaved,
  onToggleSave,
  onPress,
  layout = "wide",
}: BranchCardProps) {
  const colors = useColors();
  const { width } = useWindowDimensions();
  const prefetchBranch = usePrefetchBranch();
  const { ref: photoRef, open: flyOpen } = usePhotoFlight();

  // The cover flies from here into the place page's header.
  function open() {
    flyOpen(
      {
        branchId: branch.id,
        uri: branch.coverPhotoUrl,
        radius: 16,
        saved: isSaved,
      },
      () => onPress?.(branch),
    );
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

  // Rails use 3:4, the shape of a portrait phone photo, so most covers show
  // uncropped. Full-width list cards stay landscape to keep lists scannable.
  const aspectRatio = layout === "portrait" ? CARD_PORTRAIT_RATIO : 4 / 3;
  const textInset = layout === "wide" ? 3 : 4;

  return (
    <PressableScale
      className="w-full"
      onPress={open}
      // Start loading the page (and its cover) as the finger lands.
      onPressIn={() => prefetchBranch(branch)}
    >
      <View
        className="w-full overflow-hidden rounded-2xl bg-placeholder"
        collapsable={false}
        ref={photoRef}
        style={{ aspectRatio }}
      >
        {branch.coverPhotoUrl ? (
          <Photo
            displayWidth={layout === "portrait" ? width / 2 : width}
            style={{ width: "100%", height: "100%" }}
            thumbhash={branch.coverPhotoThumbhash}
            uri={branch.coverPhotoUrl}
          />
        ) : (
          <PhotoFallback iconSize={44} />
        )}

        {badge ? (
          // One line, never wider than the photo (less both margins): a long
          // label ends in "..." rather than wrapping or touching the edge.
          <View
            className="absolute left-3 top-3 rounded-full bg-surface px-3 py-1"
            style={{ maxWidth: "85%" }}
          >
            <ThemedText
              numberOfLines={1}
              size="xs"
              tone={badge.tone}
              weight="medium"
            >
              {badge.label}
            </ThemedText>
          </View>
        ) : null}

        {/* Bottom-right, so the open/closed pill has the top to itself. */}
        <SaveHeartButton
          className={`absolute bottom-3 right-3 ${
            layout === "wide" ? "size-12" : "size-10"
          }`}
          iconSize={layout === "wide" ? 24 : 20}
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
          // Two-across rail cards are narrow; a full title matters more there
          // than the larger size.
          size={layout === "portrait" ? "md" : "lg"}
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
        {/* "For you": a quiet note when there's a specific reason. */}
        {branch.reason ? (
          <View className="mt-1 flex-row items-start gap-1.5">
            {/* Centered on the first line (sm line height). */}
            <View className="justify-center" style={{ height: 19 }}>
              <AppIcon color={colors.muted} icon={SparklesIcon} size={14} />
            </View>
            <ThemedText
              className="shrink"
              numberOfLines={2}
              size="sm"
              tone="muted"
            >
              {branch.reason}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </PressableScale>
  );
}
