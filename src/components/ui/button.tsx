import type { ComponentProps } from "react";
import { ActivityIndicator, Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

type Variant = "primary" | "secondary" | "ghost";
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
  className?: string;
};

const VARIANTS: Record<
  Variant,
  { container: string; tone: "inverse" | "default"; color: string }
> = {
  primary: { container: "bg-primary", tone: "inverse", color: colors.inverse },
  secondary: {
    container: "bg-surface border border-border",
    tone: "default",
    color: colors.foreground,
  },
  ghost: { container: "", tone: "default", color: colors.foreground },
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
  className = "",
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
          {icon ? <AppIcon color={v.color} icon={icon} size={18} /> : null}
          <ThemedText tone={v.tone} weight="semibold">
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}
