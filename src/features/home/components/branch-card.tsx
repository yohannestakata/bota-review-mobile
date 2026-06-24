import {
  CheckmarkBadge01Icon,
  FavouriteIcon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
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
};

export function BranchCard({
  branch,
  isSaved,
  onToggleSave,
  onPress,
}: BranchCardProps) {
  const subtitle = [branch.label, branch.neighborhood?.name]
    .filter(Boolean)
    .join(" · ");

  const price = priceLabel(branch.priceLevel);
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;

  return (
    <Pressable className="w-full" onPress={() => onPress?.(branch)}>
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
          <View
            className={`absolute left-2 top-2 rounded-full border bg-surface px-2 py-0.5 ${
              branch.isOpenNow ? "border-success" : "border-danger"
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
          className="absolute right-2 top-2 size-9 items-center justify-center rounded-full bg-white/90"
          hitSlop={8}
          onPress={() => onToggleSave(branch)}
        >
          <AppIcon
            color={isSaved ? colors.favorite : colors.foreground}
            icon={FavouriteIcon}
            size={18}
            strokeWidth={isSaved ? 2.5 : 2}
          />
        </Pressable>
      </View>

      <View className="mt-2">
        <View className="flex-row items-center gap-1">
          <ThemedText
            className="shrink"
            numberOfLines={1}
            size="lg"
            weight="medium"
          >
            {branch.placeName}
          </ThemedText>
          {branch.verificationStatus &&
          branch.verificationStatus !== "unverified" ? (
            <AppIcon
              color={colors.success}
              icon={CheckmarkBadge01Icon}
              size={15}
            />
          ) : null}
        </View>
        {subtitle ? (
          <ThemedText numberOfLines={1} tone="muted">
            {subtitle}
          </ThemedText>
        ) : null}

        <View className="mt-0.5 flex-row items-center gap-1">
          {hasRating ? (
            <>
              <AppIcon color={colors.foreground} icon={StarIcon} size={14} />
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
