import { Text } from "react-native";
import type { ComponentProps } from "react";

type TextSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl";
type TextTone = "default" | "muted" | "brand" | "inverse";
type TextWeight = "normal" | "medium" | "semibold" | "bold";

type ThemedTextProps = ComponentProps<typeof Text> & {
  size?: TextSize;
  tone?: TextTone;
  weight?: TextWeight;
};

const sizeClass: Record<TextSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-md",
  lg: "text-lg",
  xl: "text-xl",
  "2xl": "text-2xl",
  "3xl": "text-3xl",
  "4xl": "text-4xl",
  "5xl": "text-5xl",
};

const toneClass: Record<TextTone, string> = {
  default: "text-foreground",
  muted: "text-muted",
  brand: "text-foreground",
  inverse: "text-inverse",
};

const weightClass: Record<TextWeight, string> = {
  normal: "font-outfit",
  medium: "font-outfit-medium",
  semibold: "font-outfit-semibold",
  bold: "font-outfit-bold",
};

function classes(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function ThemedText({
  size = "md",
  tone = "default",
  weight = "normal",
  className,
  ...props
}: ThemedTextProps) {
  return (
    <Text
      className={classes(
        sizeClass[size],
        toneClass[tone],
        weightClass[weight],
        className,
      )}
      {...props}
    />
  );
}
