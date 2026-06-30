import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
import { View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";

type Amenity = { id: string; name: string };

export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  return (
    <View className="flex-row flex-wrap">
      {amenities.map((amenity) => (
        <View
          className="w-1/2 flex-row items-center gap-2 py-1.5"
          key={amenity.id}
        >
          <AppIcon
            color={colors.success}
            icon={CheckmarkCircle02Icon}
            size={18}
          />
          <ThemedText numberOfLines={1}>{amenity.name}</ThemedText>
        </View>
      ))}
    </View>
  );
}
