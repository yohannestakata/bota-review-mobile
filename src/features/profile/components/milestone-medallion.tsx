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

// A badge as a collectible object: its 3D art inside a progress ring. The ring
// fills as the user gets closer and closes fully once earned; locked art is a
// flat grey silhouette so they see what it is without it looking won.
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
  const artSize = Math.round(size * 0.56);

  const art = ART[milestone.id];
  const newDot = showNewDot ? (
    <View
      accessibilityElementsHidden
      className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-background bg-favorite"
    />
  ) : null;
  // Badges without 3D art keep the original solid disc when earned.
  if (earned && !art) {
    return (
      <View style={{ width: size, height: size }}>
        <View
          className="size-full items-center justify-center rounded-full bg-primary"
          style={{ borderWidth: 2, borderColor: "rgba(255,255,255,0.18)" }}
        >
          <AppIcon color={colors.inverse} icon={icon} size={iconSize} />
        </View>
        {newDot}
      </View>
    );
  }

  // The ring is the progress: a closed green ring means earned.
  const fill = earned ? 1 : ratio;
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
        // Earned: full-colour 3D art. Locked: the same shape as a flat grey
        // silhouette — recognisable, clearly not yet earned.
        <Image
          contentFit="contain"
          source={art}
          style={{ width: artSize, height: artSize }}
          tintColor={earned ? undefined : colors.subtle}
        />
      ) : (
        <AppIcon color={colors.subtle} icon={icon} size={iconSize} />
      )}
      {newDot}
    </View>
  );
}
