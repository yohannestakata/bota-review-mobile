import * as Location from "expo-location";
import { useCallback, useEffect, useState } from "react";
import { Linking } from "react-native";

import { debugLog } from "@/lib/debug";

export type Coords = { lat: number; lng: number };
type LocationStatus = "idle" | "granted" | "denied";

// Requests foreground location, resolves coordinates + a human label (reverse
// geocoded area), and exposes a `request` action to re-prompt or open Settings.
export function useLocation() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [label, setLabel] = useState<string | null>(null);
  const [status, setStatus] = useState<LocationStatus>("idle");

  const load = useCallback(async () => {
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      debugLog("location", "permission", {
        granted: permission.granted,
        canAskAgain: permission.canAskAgain,
        status: permission.status,
      });
      if (!permission.granted) {
        setStatus("denied");
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const next = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      };
      debugLog("location", "coords resolved", {
        lat: next.lat,
        lng: next.lng,
        accuracy: position.coords.accuracy,
      });
      setCoords(next);
      setStatus("granted");

      try {
        const [place] = await Location.reverseGeocodeAsync({
          latitude: next.lat,
          longitude: next.lng,
        });
        const resolved =
          place?.district ?? place?.city ?? place?.subregion ?? null;
        debugLog("location", "reverse geocoded", {
          label: resolved,
          city: place?.city,
          district: place?.district,
          subregion: place?.subregion,
        });
        setLabel(resolved);
      } catch {
        // Label is optional; ignore reverse-geocode failures.
      }
    } catch (error) {
      debugLog("location", "failed to get position", {
        message: error instanceof Error ? error.message : "Unknown error",
      });
      setStatus("denied");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Re-prompt when possible; if the user permanently denied, open Settings.
  const request = useCallback(async () => {
    const permission = await Location.getForegroundPermissionsAsync();
    if (!permission.granted && !permission.canAskAgain) {
      void Linking.openSettings();
      return;
    }
    void load();
  }, [load]);

  return { coords, label, status, request };
}
