import type { ComponentProps, ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

type Variant = "primary" | "secondary" | "outline" | "ghost";
type Size = "md" | "sm";
type IconType = ComponentProps<typeof AppIcon>["icon"];

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconType;
  leftSlot?: ReactNode;
  className?: string;
  textClassName?: string;
  tone?: "inverse" | "default" | "brand" | "muted";
};

const VARIANTS: Record<
  Variant,
  { container: string; tone: "inverse" | "default" | "brand"; color: string }
> = {
  primary: { container: "bg-primary", tone: "inverse", color: colors.inverse },
  secondary: {
    container: "border border-primary bg-surface",
    tone: "brand",
    color: colors.primary,
  },
  outline: {
    container: "border border-placeholder bg-surface",
    tone: "default",
    color: colors.foreground,
  },
  ghost: { container: "", tone: "brand", color: colors.primary },
};

const SIZES: Record<Size, string> = {
  md: "h-16",
  sm: "h-14",
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  leftSlot,
  className = "",
  textClassName,
  tone,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      className={`flex-row items-center justify-center gap-2 rounded-full px-6 ${SIZES[size]} ${v.container} ${isDisabled ? "opacity-40" : ""} ${className}`}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={v.color} />
      ) : (
        <>
          {leftSlot ?? null}
          {icon ? <AppIcon color={v.color} icon={icon} size={18} /> : null}
          <ThemedText
            className={textClassName}
            tone={tone ?? v.tone}
            weight="semibold"
          >
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
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
  return (
    <Pressable
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
    </Pressable>
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
    <Pressable
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
    </Pressable>
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
  return (
    <Pressable
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
    </Pressable>
  );
}
