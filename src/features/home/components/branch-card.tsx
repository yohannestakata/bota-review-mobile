import { FavouriteIcon, StarIcon } from "@hugeicons/core-free-icons";
import { colors, shadows } from "@/lib/theme";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { priceLabel, type BranchCard as BranchCardData } from "@/lib/api";

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

  const price = priceLabel(branch.priceLevel);
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;

  const imageClass =
    layout === "portrait"
      ? "aspect-[4/5] rounded-[28px]"
      : "aspect-[4/3] rounded-[24px]";
  const textInset = layout === "portrait" ? 5 : 4;

  return (
    <Pressable className="w-full" onPress={() => onPress?.(branch)}>
      <View className={`w-full overflow-hidden bg-placeholder ${imageClass}`}>
        {branch.coverPhotoUrl ? (
          <Image
            contentFit="cover"
            source={branch.coverPhotoUrl}
            style={{ width: "100%", height: "100%" }}
            transition={150}
          />
        ) : null}

        {branch.isOpenNow !== undefined ? (
          <View
            className={`absolute left-3 top-3 rounded-full bg-surface px-3 py-1 ${
              branch.isOpenNow ? "" : "border border-danger"
            }`}
          >
            <ThemedText
              className={branch.isOpenNow ? "text-success" : "text-danger"}
              size="xs"
              weight="medium"
            >
              {branch.isOpenNow ? "Open" : "Closed"}
            </ThemedText>
          </View>
        ) : null}

        <Pressable
          className="absolute right-3 top-3 size-12 items-center justify-center rounded-full bg-surface"
          hitSlop={8}
          onPress={() => onToggleSave(branch)}
          style={shadows.cardControl}
        >
          <AppIcon
            color={isSaved ? colors.favorite : colors.foreground}
            icon={FavouriteIcon}
            size={24}
            strokeWidth={isSaved ? 2.5 : 2}
          />
        </Pressable>
      </View>

      <View className="mt-3" style={{ paddingLeft: textInset }}>
        <ThemedText
          className="shrink"
          numberOfLines={2}
          size="lg"
          weight="semibold"
        >
          {branch.placeName}
        </ThemedText>
        {subtitle ? (
          <ThemedText numberOfLines={2} size="sm" tone="muted">
            {subtitle}
          </ThemedText>
        ) : null}

        <View className="mt-0.5 flex-row items-center gap-1">
          {hasRating ? (
            <>
              <AppIcon color={colors.rating} icon={StarIcon} size={14} />
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
