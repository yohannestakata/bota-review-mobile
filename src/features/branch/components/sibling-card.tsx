import {
  CheckmarkBadge01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
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
      <View className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-200">
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
            className={`absolute left-2 top-2 rounded-full border bg-white px-2 py-0.5 ${
              branch.isOpenNow ? "border-green-600" : "border-red-500"
            }`}
          >
            <ThemedText
              className={branch.isOpenNow ? "text-green-700" : "text-red-600"}
              size="xs"
              weight="medium"
            >
              {branch.isOpenNow ? "Open" : "Closed"}
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View className="mt-2">
        <View className="flex-row items-center gap-1">
          <ThemedText
            className="shrink"
            numberOfLines={1}
            size="lg"
            weight="medium"
          >
            {title}
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
