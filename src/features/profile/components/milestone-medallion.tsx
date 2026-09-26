import { Image } from "expo-image";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors } from "@/lib/theme";

import type { Milestone } from "../api";
import { milestoneIcon } from "../milestone-meta";

const RING_WIDTH = 3;

// Light 3D versions of each badge's Hugeicons glyph (the exact same outline,
// built as rounded tubes in design/3d-icons/bota-icons.blend), rendered to fill
// the same 24-unit box as the line icon so they drop in at the same size.
const ART: Record<string, number> = {
  first_review: require("@/assets/icons3d/first_review.png"),
  first_photo: require("@/assets/icons3d/first_photo.png"),
  reviews_5: require("@/assets/icons3d/reviews_5.png"),
  saves_10: require("@/assets/icons3d/saves_10.png"),
  neighborhoods_3: require("@/assets/icons3d/neighborhoods_3.png"),
  place_live: require("@/assets/icons3d/place_live.png"),
  reviews_10: require("@/assets/icons3d/reviews_10.png"),
};

// A badge as a collectible object. Earned: a solid brand disc with the light
// 3D icon. Locked: the icon as a grey silhouette inside a progress ring, so the
// user sees what it is and how close they are — not a wall of padlocks.
export function MilestoneMedallion({
  milestone,
  size = 60,
  showNewDot = false,
}: {
  milestone: Pick<Milestone, "id" | "earned" | "progress">;
  size?: number;
  showNewDot?: boolean;
}) {
  const { earned, progress } = milestone;
  const icon = milestoneIcon(milestone.id);
  const radius = (size - RING_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = progress.target > 0 ? progress.current / progress.target : 0;
  const iconSize = Math.round(size * 0.4);

  const art = ART[milestone.id];
  const newDot = showNewDot ? (
    <View
      accessibilityElementsHidden
      className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-background bg-favorite"
    />
  ) : null;
  // Earned: the solid brand disc, with the light 3D icon (same size and shape
  // as the line icon it replaces) or the line icon when there's no art.
  if (earned) {
    return (
      <View style={{ width: size, height: size }}>
        <View
          className="size-full items-center justify-center rounded-full bg-primary"
          style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" }}
        >
          {art ? (
            <Image
              contentFit="contain"
              source={art}
              style={{ width: iconSize, height: iconSize }}
            />
          ) : (
            <AppIcon color={colors.inverse} icon={icon} size={iconSize} />
          )}
        </View>
        {newDot}
      </View>
    );
  }

  // Locked: the ring fills with progress.
  const fill = ratio;
  return (
    <View
      className="items-center justify-center"
      style={{ width: size, height: size }}
    >
      <Svg
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
        width={size}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          fill="none"
          r={radius}
          stroke={colors.border}
          strokeWidth={RING_WIDTH}
        />
        {fill > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke={colors.primary}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - fill)}
            strokeLinecap="round"
            strokeWidth={RING_WIDTH}
          />
        ) : null}
      </Svg>
      {art ? (
        // The same shape as a flat grey silhouette — recognisable, not earned.
        <Image
          contentFit="contain"
          source={art}
          style={{ width: iconSize, height: iconSize }}
          tintColor={colors.subtle}
        />
      ) : (
        <AppIcon color={colors.subtle} icon={icon} size={iconSize} />
      )}
      {newDot}
    </View>
  );
}
