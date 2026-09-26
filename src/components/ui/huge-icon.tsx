import { HugeiconsIcon } from "@hugeicons/react-native";
import { useColors } from "@/lib/theme";
import type { ComponentProps } from "react";

type HugeiconsIconProps = ComponentProps<typeof HugeiconsIcon>;

type AppIconProps = Omit<
  HugeiconsIconProps,
  "color" | "size" | "strokeWidth"
> & {
  color?: string;
  size?: number;
  strokeWidth?: number;
};

export function AppIcon({
  color,
  size = 24,
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  const colors = useColors();
  return (
    <HugeiconsIcon
      color={color ?? colors.foreground}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
