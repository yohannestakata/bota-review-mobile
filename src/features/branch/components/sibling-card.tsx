import { StarIcon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";
import type { BranchCard as BranchCardData } from "@/lib/api";

type SiblingCardProps = {
  branch: BranchCardData;
  onPress: (branch: BranchCardData) => void;
};

// Compact card for the "Other locations" rail. The place is already obvious from
// the detail page, so the neighborhood + distance + open status do the talking.
export function SiblingCard({ branch, onPress }: SiblingCardProps) {
  const title = branch.neighborhood?.name ?? branch.label ?? "Location";
  const hasRating = branch.reviewCount > 0;
  const distance =
    branch.distanceKm != null
      ? branch.distanceKm < 1
        ? `${Math.round(branch.distanceKm * 1000)} m`
        : `${branch.distanceKm.toFixed(1)} km`
      : null;

  return (
    <Pressable className="w-44" onPress={() => onPress(branch)}>
      <View className="aspect-[4/3] w-full overflow-hidden rounded-2xl bg-neutral-200">
        {branch.coverPhotoUrl ? (
          <Image
            contentFit="cover"
            source={branch.coverPhotoUrl}
            style={{ width: "100%", height: "100%" }}
            transition={150}
          />
        ) : null}
      </View>

      <View className="mt-2 gap-0.5">
        <ThemedText numberOfLines={1} weight="medium">
          {title}
        </ThemedText>
        <View className="flex-row items-center gap-1">
          {branch.isOpenNow !== undefined ? (
            <ThemedText
              className={branch.isOpenNow ? "text-green-700" : "text-red-600"}
              size="sm"
              weight="medium"
            >
              {branch.isOpenNow ? "Open" : "Closed"}
            </ThemedText>
          ) : null}
          {distance ? (
            <ThemedText size="sm" tone="muted">
              {branch.isOpenNow !== undefined ? ` · ${distance}` : distance}
            </ThemedText>
          ) : hasRating ? (
            <View className="flex-row items-center gap-1">
              <AppIcon color={colors.foreground} icon={StarIcon} size={13} />
              <ThemedText size="sm" tone="muted">
                {Number(branch.rating).toFixed(1)}
              </ThemedText>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}
