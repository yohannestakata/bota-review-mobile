import {
  Call02Icon,
  Navigation03Icon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { Linking, Share, View } from "react-native";

import { ActionTile } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

type QuickActionsProps = {
  branchId: string;
  name: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
};

export function QuickActions({
  branchId,
  name,
  phone,
  latitude,
  longitude,
}: QuickActionsProps) {
  const hasCoords = Boolean(latitude && longitude);

  const onCall = () => {
    if (phone) {
      analytics.track("phone_clicked", { branch_id: branchId });
      void Linking.openURL(`tel:${phone.replace(/\s+/g, "")}`);
    }
  };

  const onDirections = () => {
    if (hasCoords) {
      analytics.track("directions_clicked", { branch_id: branchId });
      void Linking.openURL(
        `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`,
      );
    }
  };

  const onShare = () => {
    analytics.track("share_clicked", { branch_id: branchId });
    void Share.share({ message: `Check out ${name} on Bota` });
  };

  return (
    <View className="flex-row gap-3">
      <ActionTile
        disabled={!phone}
        icon={Call02Icon}
        label="Call"
        onPress={onCall}
      />
      <ActionTile
        disabled={!hasCoords}
        icon={Navigation03Icon}
        label="Directions"
        onPress={onDirections}
      />
      <ActionTile icon={Share08Icon} label="Share" onPress={onShare} />
    </View>
  );
}
