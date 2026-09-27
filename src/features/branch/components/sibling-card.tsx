import { View } from "react-native";

import { Photo, PhotoFallback } from "@/components/ui/photo";
import { FilledStar } from "@/components/ui/filled-star";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard as BranchCardData } from "@/lib/api";
import { formatMenuPriceRange } from "@/lib/price";
import { PressableScale } from "@/components/ui/pressable-scale";

import { openBadge } from "../hours";

type SiblingCardProps = {
  branch: BranchCardData;
  onPress: (branch: BranchCardData) => void;
};

// "Other locations" rail card. Same data + styling as BranchCard, but titled by
// neighborhood (the place is already obvious here) and without the save heart.
export function SiblingCard({ branch, onPress }: SiblingCardProps) {
  const title = branch.neighborhood?.name ?? branch.label ?? "Location";
  const badge = openBadge(branch);
  const price = formatMenuPriceRange(branch.menuPriceRange);
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;

  return (
    <PressableScale className="w-56" onPress={() => onPress(branch)}>
      <View className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-placeholder">
        {branch.coverPhotoUrl ? (
          <Photo
            style={{ width: "100%", height: "100%" }}
            uri={branch.coverPhotoUrl}
          />
        ) : (
          <PhotoFallback iconSize={32} />
        )}

        {badge ? (
          <View className="absolute left-2 top-2 rounded-full bg-surface px-2 py-0.5">
            <ThemedText size="xs" tone={badge.tone} weight="medium">
              {badge.label}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View className="mt-2">
        <ThemedText
          className="shrink"
          numberOfLines={1}
          size="lg"
          weight="medium"
        >
          {title}
        </ThemedText>

        <View className="mt-0.5 flex-row items-center gap-1">
          {hasRating ? (
            <>
              <FilledStar size={14} />
              <ThemedText size="sm" weight="medium">
                {Number(branch.rating).toFixed(1)}
              </ThemedText>
              <ThemedText size="sm" tone="muted">
                ({branch.reviewCount})
              </ThemedText>
            </>
          ) : (
            <ThemedText size="sm" tone="muted">
              New
            </ThemedText>
          )}
          {price ? (
            <ThemedText size="sm" tone="muted">
              {" · "}
              {price}
            </ThemedText>
          ) : null}
          {distance ? (
            <ThemedText size="sm" tone="muted">
              {" · "}
              {distance}
            </ThemedText>
          ) : null}
        </View>
      </View>
    </PressableScale>
  );
}
