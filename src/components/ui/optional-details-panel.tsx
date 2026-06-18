import {
  Add01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import type { ReactNode } from "react";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

type OptionalDetailsPanelProps = {
  title: string;
  subtitle: string;
  expanded: boolean;
  onToggle: () => void;
  children: ReactNode;
};

export function OptionalDetailsPanel({
  title,
  subtitle,
  expanded,
  onToggle,
  children,
}: OptionalDetailsPanelProps) {
  return (
    <View className="overflow-hidden rounded-3xl border border-border bg-surface">
      <Pressable
        className={cn(
          "flex-row items-center gap-3 px-4 py-4",
          "active:bg-surface",
        )}
        onPress={onToggle}
      >
        <View className="h-10 w-10 items-center justify-center rounded-2xl bg-background">
          <AppIcon
            color={colors.foreground}
            icon={expanded ? ArrowUp01Icon : Add01Icon}
            size={20}
          />
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <ThemedText size="sm" weight="semibold">
              {title}
            </ThemedText>
            <View className="rounded-full bg-background px-2 py-0.5">
              <ThemedText size="xs" tone="muted" weight="medium">
                Optional
              </ThemedText>
            </View>
          </View>
          <ThemedText className="mt-0.5" size="sm" tone="muted">
            {subtitle}
          </ThemedText>
        </View>
        <View className="h-8 w-8 items-center justify-center rounded-2xl border border-border bg-background">
          <AppIcon
            color={colors.muted}
            icon={expanded ? ArrowUp01Icon : ArrowDown01Icon}
            size={16}
          />
        </View>
      </Pressable>

      {expanded ? (
        <View className="gap-4 border-t border-border bg-surface px-4 pb-4 pt-4">
          {children}
        </View>
      ) : null}
    </View>
  );
}
