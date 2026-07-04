import { Cancel01Icon, Location01Icon } from "@hugeicons/core-free-icons";
import * as Location from "expo-location";
import { useState } from "react";
import { Linking, Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

export type PinCoords = { lat: number; lng: number };

// An explicit "pin where I am now" control. Deliberately never auto-captures:
// a user might report a place from home, so we only grab GPS on an intentional
// tap. Optional — the editor geocodes from the address when it's absent.
export function LocationPinField({
  value,
  onChange,
}: {
  value: PinCoords | null;
  onChange: (value: PinCoords | null) => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pin() {
    setError(null);
    setLoading(true);
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      let granted = permission.granted;
      if (!granted && permission.canAskAgain) {
        granted = (await Location.requestForegroundPermissionsAsync()).granted;
      }
      if (!granted) {
        setError("Location is off. Turn it on in Settings to pin the spot.");
        if (!permission.canAskAgain) void Linking.openSettings();
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      onChange({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    } catch {
      setError("Couldn't get your location. Try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Location
      </ThemedText>

      {value ? (
        <View className="flex-row items-center justify-between gap-3 rounded-xl border border-primary bg-primary/10 px-4 py-3">
          <View className="flex-1 flex-row items-center gap-2">
            <AppIcon color={colors.primary} icon={Location01Icon} size={18} />
            <View className="flex-1">
              <ThemedText weight="semibold">Pinned here</ThemedText>
              <ThemedText size="sm" tone="muted">
                {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
              </ThemedText>
            </View>
          </View>
          <Pressable hitSlop={8} onPress={() => onChange(null)}>
            <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
          </Pressable>
        </View>
      ) : (
        <Pressable
          className="flex-row items-center justify-center gap-2 rounded-xl border border-placeholder bg-background px-4 py-3.5"
          disabled={loading}
          onPress={pin}
        >
          <AppIcon color={colors.foreground} icon={Location01Icon} size={18} />
          <ThemedText weight="medium">
            {loading ? "Getting location…" : "Pin current location"}
          </ThemedText>
        </Pressable>
      )}

      <ThemedText size="xs" tone="muted">
        Only if you're here now — it helps us place it on the map.
      </ThemedText>
      {error ? (
        <ThemedText size="sm" tone="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}
