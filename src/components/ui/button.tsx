import type { ComponentProps, ReactNode } from "react";
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
  leftSlot?: ReactNode;
  className?: string;
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
          <ThemedText tone={v.tone} weight="semibold">
            {label}
          </ThemedText>
        </>
      )}
    </Pressable>
  );
}
