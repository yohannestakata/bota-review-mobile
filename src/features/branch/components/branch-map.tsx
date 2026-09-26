import {
  Camera,
  Map as MapLibreMap,
  TransformRequestManager,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import Svg, { Circle, Path } from "react-native-svg";

import { colors } from "@/lib/theme";

// A filled teardrop map pin with a white center dot; its tip sits on the point.
function MapPin() {
  return (
    <Svg width={28} height={37} viewBox="0 0 24 32">
      <Path
        d="M12 0C5.373 0 0 5.373 0 12c0 9 12 20 12 20s12-11 12-20C24 5.373 18.627 0 12 0z"
        fill={colors.primary}
      />
      <Circle cx="12" cy="12" r="4.5" fill={colors.inverse} />
    </Svg>
  );
}

// Inlined at build time (EXPO_PUBLIC_*). Empty when unset — the map hides
// itself so the rest of the location UI still works without a key.
const GEBETA_API_KEY = process.env.EXPO_PUBLIC_GEBETA_API_KEY ?? "";

// Gebeta's public style; its tile/glyph/sprite sources all live on this host.
const GEBETA_STYLE_URL =
  "https://tiles.gebeta.app/styles/standard/style.json?device=mobile";

// Gebeta's tile server authenticates via an `Authorization: Bearer` header and
// rejects any `?apiKey=` query param, so we drive MapLibre directly and attach
// the header to every request to the Gebeta host. Registered once at import.
if (GEBETA_API_KEY) {
  TransformRequestManager.addHeader({
    name: "Authorization",
    value: `Bearer ${GEBETA_API_KEY}`,
    match: "tiles\\.gebeta\\.app",
  });
}

type BranchMapProps = {
  latitude: string | null;
  longitude: string | null;
};

// An interactive location map centered on the branch, with a pin marker at its
// coordinates. Pan/zoom enabled; MapLibre's own logo/attribution are hidden in
// favor of the required "© Gebeta Maps" credit.
export function BranchMap({ latitude, longitude }: BranchMapProps) {
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (!hasCoords || !GEBETA_API_KEY) return null;

  return (
    <View className="h-56 overflow-hidden rounded-2xl border border-border">
      <MapLibreMap
        attribution={false}
        compass={false}
        logo={false}
        mapStyle={GEBETA_STYLE_URL}
        style={{ flex: 1 }}
      >
        <Camera initialViewState={{ center: [lng, lat], zoom: 16.5 }} />
        <ViewAnnotation anchor="bottom" lngLat={[lng, lat]}>
          <MapPin />
        </ViewAnnotation>
      </MapLibreMap>

      {/* Required Gebeta attribution. */}
      <View
        className="absolute bottom-1.5 right-1.5 rounded bg-background/80 px-1.5 py-0.5"
        pointerEvents="none"
      >
        <ThemedText size="xs" tone="muted">
          © Gebeta Maps
        </ThemedText>
      </View>
    </View>
  );
}
