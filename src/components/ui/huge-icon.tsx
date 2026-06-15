import { HugeiconsIcon } from "@hugeicons/react-native";
import { colors } from "@/lib/theme";
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
  color = colors.foreground,
  size = 24,
  strokeWidth = 2,
  ...props
}: AppIconProps) {
  return (
    <HugeiconsIcon
      color={color}
      size={size}
      strokeWidth={strokeWidth}
      {...props}
    />
  );
}
