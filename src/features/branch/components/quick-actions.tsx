import {
  Call02Icon,
  Navigation03Icon,
  Share08Icon,
} from "@hugeicons/core-free-icons";
import { Linking, Platform, Share, View } from "react-native";

import { ActionTile } from "@/components/ui/button";
import { analytics } from "@/lib/analytics";

type QuickActionsProps = {
  branchId: string;
  /** From the API; links read like …/p/wow-burger-bole-3f2a9c1b. */
  shareUrl?: string;
  name: string;
  phone: string | null;
  latitude: string | null;
  longitude: string | null;
};

// Fallback for an API that doesn't send shareUrl yet. Share pages unfurl in
// chats and open the app if installed.
const SHARE_BASE_URL = "https://bota-review-api.onrender.com";

export function QuickActions({
  branchId,
  shareUrl,
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
    // The link unfurls into a rich preview in chats and opens the app when
    // it's installed (see backend ShareController).
    const url = shareUrl ?? `${SHARE_BASE_URL}/p/${branchId}`;
    void Share.share(
      Platform.OS === "ios"
        ? { message: `Check out ${name} on Bota`, url }
        : { message: `Check out ${name} on Bota\n${url}` },
    );
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
