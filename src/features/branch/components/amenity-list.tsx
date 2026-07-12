import {
  CheckmarkCircle02Icon,
  CreditCardIcon,
  MusicNote01Icon,
  ParkingAreaCircleIcon,
  SnowIcon,
  UmbrellaIcon,
  WheelchairIcon,
  Wifi01Icon,
} from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";
import { View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import type { Amenity } from "@/lib/api";
import { colors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

// Per-amenity icons keyed by slug. Amenities are a small, controlled taxonomy,
// so a static map gives full design control; anything unmapped falls back to a
// neutral check.
const AMENITY_ICONS: Record<string, IconType> = {
  wifi: Wifi01Icon,
  parking: ParkingAreaCircleIcon,
  "outdoor-seating": UmbrellaIcon,
  "card-payment": CreditCardIcon,
  "wheelchair-accessible": WheelchairIcon,
  "live-music": MusicNote01Icon,
  "air-conditioning": SnowIcon,
};

// Normalise a slug (or fall back to the name) into the map's key format.
function amenityKey(amenity: Amenity): string {
  return (amenity.slug ?? amenity.name)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function AmenityList({ amenities }: { amenities: Amenity[] }) {
  return (
    <View className="flex-row flex-wrap">
      {amenities.map((amenity) => (
        <View
          className="w-1/2 flex-row items-start gap-2 py-1.5 pr-2"
          key={amenity.id}
        >
          <View className="mt-0.5">
            <AppIcon
              color={colors.foreground}
              icon={AMENITY_ICONS[amenityKey(amenity)] ?? CheckmarkCircle02Icon}
              size={18}
            />
          </View>
          <ThemedText className="flex-1" numberOfLines={2}>
            {amenity.name}
          </ThemedText>
        </View>
      ))}
    </View>
  );
}
