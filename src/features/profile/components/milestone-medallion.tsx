import { Image } from "expo-image";
import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors } from "@/lib/theme";

import type { Milestone } from "../api";
import { milestoneIcon } from "../milestone-meta";

const RING_WIDTH = 3;

// Rendered 3D art per badge (design/3d-icons/bota-icons.blend), shown in place
// of the line icon on earned badges. Badges without art keep the line icon.
const ART: Record<string, number> = {
  first_review: require("@/assets/icons3d/first_review.png"),
  first_photo: require("@/assets/icons3d/first_photo.png"),
  reviews_5: require("@/assets/icons3d/reviews_5.png"),
  saves_10: require("@/assets/icons3d/saves_10.png"),
  neighborhoods_3: require("@/assets/icons3d/neighborhoods_3.png"),
  place_live: require("@/assets/icons3d/place_live.png"),
  reviews_10: require("@/assets/icons3d/reviews_10.png"),
};

// A badge as a collectible object. Earned: a solid brand disc with the icon in
// white. Locked: the icon as a faint silhouette inside a progress ring, so the
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
  if (earned) {
    return (
      <View style={{ width: size, height: size }}>
        {/* A thin inner highlight gives the disc a little depth. */}
        <View
          className="flex-1 items-center justify-center rounded-full bg-primary"
          style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" }}
        >
          {art ? (
            // 3D art replaces the line icon at the same size; disc unchanged.
            <Image
              contentFit="contain"
              source={art}
              style={{ width: iconSize, height: iconSize }}
            />
          ) : (
            <AppIcon color={colors.inverse} icon={icon} size={iconSize} />
          )}
        </View>
        {showNewDot ? (
          <View
            className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-background bg-favorite"
            accessibilityElementsHidden
          />
        ) : null}
      </View>
    );
  }

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
          fill={colors.surfaceMuted}
          r={radius}
          stroke={colors.border}
          strokeWidth={RING_WIDTH}
        />
        {ratio > 0 ? (
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            stroke={colors.primary}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - ratio)}
            strokeLinecap="round"
            strokeWidth={RING_WIDTH}
          />
        ) : null}
      </Svg>
      {art ? (
        // Locked: the 3D shape as a flat silhouette — recognisable, not earned.
        <Image
          contentFit="contain"
          source={art}
          style={{ width: iconSize, height: iconSize }}
          tintColor={colors.subtle}
        />
      ) : (
        <AppIcon color={colors.subtle} icon={icon} size={iconSize} />
      )}
    </View>
  );
}
