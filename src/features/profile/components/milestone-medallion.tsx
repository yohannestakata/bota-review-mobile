import { View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { AppIcon } from "@/components/ui/huge-icon";
import { useColors } from "@/lib/theme";

import type { Milestone } from "../api";
import { milestoneIcon } from "../milestone-meta";

const RING_WIDTH = 3;

// Earned badges show a light Hugeicon on the brand disc; locked badges
// show a muted Hugeicon inside their progress ring.
export function MilestoneMedallion({
  milestone,
  size = 60,
  showNewDot = false,
}: {
  milestone: Pick<Milestone, "id" | "earned" | "progress">;
  size?: number;
  showNewDot?: boolean;
}) {
  const colors = useColors();
  const { earned, progress } = milestone;
  const icon = milestoneIcon(milestone.id);
  const radius = (size - RING_WIDTH) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = progress.target > 0 ? progress.current / progress.target : 0;
  const iconSize = Math.round(size * 0.4);

  const newDot = showNewDot ? (
    <View
      accessibilityElementsHidden
      className="absolute right-0 top-0 size-3.5 rounded-full border-2 border-background bg-favorite"
    />
  ) : null;
  // Earned: the solid brand disc with the badge's Hugeicon.
  if (earned) {
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
      <AppIcon color={colors.subtle} icon={icon} size={iconSize} />
      {newDot}
    </View>
  );
}
