import { StarIcon } from "@hugeicons/core-free-icons";

import { AppIcon } from "@/components/ui/huge-icon";
import { useColors } from "@/lib/theme";

type FilledStarProps = {
  color?: string;
  size?: number;
};

export function FilledStar({
  color: colorProp,
  size = 14,
}: FilledStarProps) {
  const colors = useColors();
  const color = colorProp ?? colors.rating;
  return <AppIcon color={color} fill={color} icon={StarIcon} size={size} />;
}
