import { Location01Icon } from "@hugeicons/core-free-icons";
import { GebetaMap } from "@gebeta/tiles-react-native";
import { Linking, Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { analytics } from "@/lib/analytics";
import { colors } from "@/lib/theme";

// Inlined at build time (EXPO_PUBLIC_*). Empty when unset — the map hides
// itself so the rest of the location UI still works without a key.
const GEBETA_API_KEY = process.env.EXPO_PUBLIC_GEBETA_API_KEY ?? "";

type BranchMapProps = {
  branchId: string;
  latitude: string | null;
  longitude: string | null;
};

// A static, tap-to-navigate location preview. The map is centered on the
// branch and we overlay a fixed pin at the visual center — the SDK's own
// marker API is unreliable, and a single fixed point doesn't need it. Tapping
// anywhere opens the device's maps app for directions.
export function BranchMap({ branchId, latitude, longitude }: BranchMapProps) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (!hasCoords || !GEBETA_API_KEY) return null;

  const openDirections = () => {
    analytics.track("directions_clicked", { branch_id: branchId });
    void Linking.openURL(
      `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    );
  };

  return (
    <View className="h-44 overflow-hidden rounded-2xl border border-border">
      <GebetaMap apiKey={GEBETA_API_KEY} center={[lng, lat]} zoom={15} />
      {/* Fixed pin at the map center (branch location). Nudged up so the pin's
          tip, not its middle, sits on the point. */}
      <View
        className="absolute inset-0 items-center justify-center"
        pointerEvents="none"
      >
        <View style={{ marginTop: -14 }}>
          <AppIcon color={colors.primary} icon={Location01Icon} size={30} />
        </View>
      </View>
      {/* Tap to open directions. Sits above the map so the whole card is the
          affordance. */}
      <Pressable
        accessibilityLabel="Open directions"
        accessibilityRole="button"
        className="absolute inset-0"
        onPress={openDirections}
      />
    </View>
  );
}
