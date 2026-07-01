import { StarIcon } from "@hugeicons/core-free-icons";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors } from "@/lib/theme";

type FilledStarProps = {
  color?: string;
  size?: number;
};

export function FilledStar({
  color = colors.rating,
  size = 14,
}: FilledStarProps) {
  return <AppIcon color={color} fill={color} icon={StarIcon} size={size} />;
}
