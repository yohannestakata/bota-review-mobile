import { Location01Icon } from "@hugeicons/core-free-icons";
import { Pressable } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

type LocationPillProps = {
  label: string | null;
  status: "idle" | "granted" | "denied";
  onPress: () => void;
};

export function LocationPill({ label, status, onPress }: LocationPillProps) {
  const text =
    status === "granted"
      ? (label ?? "Near you")
      : status === "denied"
        ? "Enable location"
        : "Locating…";

  return (
    <Pressable
      className="flex-row items-center gap-1 self-start rounded-full border border-border bg-surface px-3 py-1.5"
      hitSlop={6}
      onPress={onPress}
    >
      <AppIcon color={colors.foreground} icon={Location01Icon} size={14} />
      <ThemedText size="sm" weight="medium">
        {text}
      </ThemedText>
    </Pressable>
  );
}
