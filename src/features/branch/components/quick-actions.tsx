import {
  Call02Icon,
  Navigation03Icon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";
import { Linking, Pressable, Share, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

type QuickActionsProps = {
  name: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
};

function Action({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: IconType;
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      className={`flex-1 items-center gap-1.5 rounded-2xl bg-neutral-100 py-3 ${
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

export function QuickActions({
  name,
  phone,
  latitude,
  longitude,
}: QuickActionsProps) {
  const hasCoords = Boolean(latitude && longitude);

  const onCall = () => {
    if (phone) {
      void Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
    }
  };

  const onDirections = () => {
    if (hasCoords) {
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
    }
  };

  const onShare = () => {
    void Share.share({ message: `Check out ${name} on Bota` });
  };

  return (
    <View className="flex-row gap-3">
      <Action
        disabled={!phone}
        icon={Call02Icon}
        label="Call"
        onPress={onCall}
      />
      <Action
        disabled={!hasCoords}
        icon={Navigation03Icon}
        label="Directions"
        onPress={onDirections}
      />
      <Action icon={Share08Icon} label="Share" onPress={onShare} />
    </View>
  );
}
