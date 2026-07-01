import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { FilledStar } from "@/components/ui/filled-star";
import { ThemedText } from "@/components/ui/themed-text";
import { priceLabel, type BranchCard as BranchCardData } from "@/lib/api";
import { colors } from "@/lib/theme";

type SiblingCardProps = {
  branch: BranchCardData;
  onPress: (branch: BranchCardData) => void;
};

// "Other locations" rail card. Same data + styling as BranchCard, but titled by
// neighborhood (the place is already obvious here) and without the save heart.
export function SiblingCard({ branch, onPress }: SiblingCardProps) {
  const title = branch.neighborhood?.name ?? branch.label ?? "Location";
  const price = priceLabel(branch.priceLevel);
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;

  return (
    <Pressable className="w-56" onPress={() => onPress(branch)}>
      <View className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-placeholder">
        {branch.coverPhotoUrl ? (
          <Image
            contentFit="cover"
            source={branch.coverPhotoUrl}
            style={{ width: "100%", height: "100%" }}
            transition={150}
          />
        ) : null}

        {branch.isOpenNow !== undefined ? (
          <View className="absolute left-2 top-2 rounded-full bg-surface px-2 py-0.5">
            <ThemedText
              className={branch.isOpenNow ? "text-success" : "text-danger"}
              size="xs"
              style={{
                color: branch.isOpenNow ? colors.success : colors.danger,
              }}
              weight="medium"
            >
              {branch.isOpenNow ? "Open" : "Closed"}
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
    </Pressable>
  );
}
