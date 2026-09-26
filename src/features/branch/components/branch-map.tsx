import {
  Camera,
  Map as MapLibreMap,
  TransformRequestManager,
  ViewAnnotation,
} from "@maplibre/maplibre-react-native";
import { LogBox, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import Svg, { Circle, Path } from "react-native-svg";

import { useColors } from "@/lib/theme";

import { GEBETA_API_KEY, useMapStyle } from "../map-style";

// A filled teardrop map pin with a white center dot; its tip sits on the point.
function MapPin() {
  const colors = useColors();
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

// Gebeta's tile server authenticates via an `Authorization: Bearer` header and
// rejects any `?apiKey=` query param, so we drive MapLibre directly and attach
// the header to every request to the Gebeta host. Registered once at import.
// Gebeta's tile server answers HTTP 500 (instead of an empty 204) whenever
// MapLibre asks for a zoom outside a layer's declared range (e.g. `buildings`
// below z15, the other layers above z14). The map still renders correctly;
// MapLibre just logs each miss as an error, which floods dev with a red
// banner. Silence only log lines about that host — dev-only, no-op in release.
LogBox.ignoreLogs([/tiles\.gebeta\.app/]);

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
  /** Fires when a finger lands on / leaves the map, so a parent ScrollView can
   * stop scrolling and let the map pan instead. */
  onInteractionChange?: (active: boolean) => void;
};

// An interactive location map centered on the branch, with a pin marker at its
// coordinates. Pan/zoom enabled; MapLibre's own logo/attribution are hidden in
// favor of the required "© Gebeta Maps" credit.
export function BranchMap({
  latitude,
  longitude,
  onInteractionChange,
}: BranchMapProps) {
  // Gebeta's light style, or a darkened copy of it in dark mode.
  const mapStyle = useMapStyle();
  const lat = Number(latitude);
  const lng = Number(longitude);
  const hasCoords =
    latitude != null &&
    longitude != null &&
    Number.isFinite(lat) &&
    Number.isFinite(lng);

  if (!hasCoords || !GEBETA_API_KEY) return null;

  return (
    <View
      className="h-56 overflow-hidden rounded-2xl border border-border"
      onTouchCancel={() => onInteractionChange?.(false)}
      onTouchEnd={() => onInteractionChange?.(false)}
      onTouchStart={() => onInteractionChange?.(true)}
    >
      {mapStyle ? (
        <MapLibreMap
          attribution={false}
          compass={false}
          logo={false}
          mapStyle={mapStyle}
          style={{ flex: 1 }}
        >
          <Camera initialViewState={{ center: [lng, lat], zoom: 16.5 }} />
          <ViewAnnotation anchor="bottom" lngLat={[lng, lat]}>
            <MapPin />
          </ViewAnnotation>
        </MapLibreMap>
      ) : (
        <View className="flex-1 bg-placeholder" />
      )}

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
