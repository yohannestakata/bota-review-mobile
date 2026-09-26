import type { ComponentProps } from "react";
import { View } from "react-native";

import { Button } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { useColors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

type EmptyAction = { label: string; onPress: () => void };

// The one empty state for lists and screens. Every empty state should give the
// user somewhere to go next — pass `action` (and optionally `secondaryAction`)
// rather than leaving a dead end.
export function EmptyState({
  icon,
  title,
  body,
  action,
  secondaryAction,
  className = "mt-20",
}: {
  icon: IconType;
  title: string;
  body?: string;
  action?: EmptyAction;
  secondaryAction?: EmptyAction;
  className?: string;
}) {
  const colors = useColors();
  return (
    <View className={`items-center px-8 ${className}`}>
      <View className="mb-4 h-16 w-16 items-center justify-center rounded-full bg-surface-muted">
        <AppIcon color={colors.primary} icon={icon} size={28} />
      </View>
      <ThemedText className="text-center" size="lg" weight="semibold">
        {title}
      </ThemedText>
      {body ? (
        <ThemedText className="mt-1.5 text-center" tone="muted">
          {body}
        </ThemedText>
      ) : null}
      {action ? (
        <Button
          className="mt-5"
          label={action.label}
          onPress={action.onPress}
          size="xs"
        />
      ) : null}
      {secondaryAction ? (
        <Button
          className="mt-1"
          label={secondaryAction.label}
          onPress={secondaryAction.onPress}
          size="xs"
          variant="ghost"
        />
      ) : null}
    </View>
  );
}
