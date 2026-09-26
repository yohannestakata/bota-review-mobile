import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { PressableScale } from "@/components/ui/pressable-scale";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors, type ColorToken } from "@/lib/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "md" | "sm" | "xs";
type IconType = ComponentProps<typeof AppIcon>["icon"];

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconType;
  rightIcon?: IconType;
  leftSlot?: ReactNode;
  className?: string;
  textClassName?: string;
  tone?: "inverse" | "default" | "brand" | "muted";
};

const VARIANTS: Record<
  Variant,
  {
    container: string;
    tone: "inverse" | "default" | "brand";
    color: ColorToken;
  }
> = {
  primary: { container: "bg-primary", tone: "inverse", color: "inverse" },
  secondary: {
    container: "border border-primary bg-surface",
    tone: "brand",
    color: "primary",
  },
  outline: {
    container: "border border-placeholder bg-surface",
    tone: "default",
    color: "foreground",
  },
  ghost: { container: "", tone: "brand", color: "primary" },
};

const SIZES: Record<Size, string> = {
  md: "h-16",
  sm: "h-14",
  xs: "h-12 gap-1.5",
};

// Horizontal padding per size, skipped entirely for the ghost variant so it
// sits flush.
const SIZE_PADDING: Record<Size, string> = {
  md: "px-6",
  sm: "px-6",
  xs: "px-4",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  rightIcon,
  leftSlot,
  className = "",
  textClassName,
  tone,
}: ButtonProps) {
  const colors = useColors();
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <PressableScale
      className={`flex-row items-center justify-center gap-2 rounded-full ${SIZES[size]} ${variant === "ghost" ? "" : SIZE_PADDING[size]} ${v.container} ${isDisabled ? "opacity-40" : ""} ${className}`}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.color]} />
      ) : (
        <>
          {leftSlot ?? null}
          {icon ? (
            <AppIcon
              color={colors[v.color]}
              icon={icon}
              size={size === "xs" ? 16 : 18}
            />
          ) : null}
          <ThemedText
            className={`shrink text-center ${textClassName ?? ""}`}
            numberOfLines={2}
            size={size === "xs" ? "sm" : undefined}
            tone={tone ?? v.tone}
            weight="semibold"
          >
            {label}
          </ThemedText>
          {rightIcon ? (
            <AppIcon
              color={colors[v.color]}
              icon={rightIcon}
              size={size === "xs" ? 16 : 18}
            />
          ) : null}
        </>
      )}
    </PressableScale>
  );
}

// An inline text action ("Try again", "Clear", "Edit"). One size, weight and
// hit area everywhere so these links stop drifting screen to screen. Use
// `Button variant="ghost"` instead when the action needs button height.
export function TextButton({
  label,
  onPress,
  tone = "brand",
  size = "sm",
  disabled = false,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  /** `inverse` is for dark surfaces such as the photo viewer. */
  tone?: "brand" | "muted" | "danger" | "inverse";
  size?: "sm" | "md";
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      className={disabled ? "opacity-40" : ""}
      disabled={disabled}
      // Pads the ~19pt line out to a ~44pt touch target without changing the
      // layout — these sit in dense rows where a small target is easy to miss.
      hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
      onPress={onPress}
    >
      <ThemedText size={size} tone={tone} weight="semibold">
        {label}
      </ThemedText>
    </PressableScale>
  );
}

export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  overlay = false,
  size = 40,
  iconSize = 20,
  className = "",
  style,
  children,
}: {
  icon?: IconType;
  onPress: () => void;
  accessibilityLabel: string;
  overlay?: boolean;
  size?: number;
  iconSize?: number;
  className?: string;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const colors = useColors();
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      className={`items-center justify-center rounded-full ${
        overlay ? "bg-white/20" : "bg-surface"
      } ${className}`}
      hitSlop={8}
      onPress={onPress}
      style={[{ height: size, width: size }, style]}
    >
      {children ??
        (icon ? (
          <AppIcon
            color={overlay ? colors.inverse : colors.foreground}
            icon={icon}
            size={iconSize}
          />
        ) : null)}
    </PressableScale>
  );
}

export function ChipButton({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      className={`rounded-full px-4 py-2 ${
        selected ? "bg-primary" : "border border-placeholder bg-surface"
      }`}
      onPress={onPress}
    >
      <ThemedText
        size="sm"
        tone={selected ? "inverse" : "default"}
        weight="medium"
      >
        {label}
      </ThemedText>
    </PressableScale>
  );
}

export function ActionTile({
  icon,
  label,
  onPress,
  disabled = false,
}: {
  icon: IconType;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const colors = useColors();
  return (
    <PressableScale
      className={`flex-1 items-center gap-1.5 rounded-2xl bg-surface-muted py-3 ${
        disabled ? "opacity-40" : ""
      }`}
      disabled={disabled}
      onPress={onPress}
    >
      <AppIcon color={colors.foreground} icon={icon} size={22} />
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
    </PressableScale>
  );
}
