import { WifiDisconnected02Icon } from "@hugeicons/core-free-icons";
import { onlineManager } from "@tanstack/react-query";
import * as Network from "expo-network";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

// Treat "connected but internet unreachable" as offline too. Unknown (undefined)
// counts as online so we never flash the banner on launch.
function isOnline(state: Network.NetworkState) {
  return state.isConnected !== false && state.isInternetReachable !== false;
}

// Feed the device's real connectivity into TanStack Query: while offline,
// queries pause instead of failing, and everything refetches on reconnect.
onlineManager.setEventListener((setOnline) => {
  const sub = Network.addNetworkStateListener((state) =>
    setOnline(isOnline(state)),
  );
  void Network.getNetworkStateAsync().then((state) =>
    setOnline(isOnline(state)),
  );
  return () => sub.remove();
});

// A slim pill near the bottom while the device is offline, so screens
// showing cached data explain themselves instead of silently not updating.
export function OfflineBanner() {
  const [online, setOnline] = useState(onlineManager.isOnline());
  const insets = useSafeAreaInsets();

  useEffect(() => onlineManager.subscribe(setOnline), []);

  if (online) return null;
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      pointerEvents="none"
      // Just above the tab bar, so it never covers screen headers.
      style={{
        position: "absolute",
        bottom: insets.bottom + 64,
        left: 0,
        right: 0,
      }}
    >
      <View
        className="mx-auto flex-row items-center gap-2 rounded-full px-4 py-2"
        style={{ backgroundColor: colors.pill }}
      >
        <AppIcon
          color={colors.inverse}
          icon={WifiDisconnected02Icon}
          size={16}
        />
        <ThemedText size="sm" tone="inverse" weight="medium">
          You&apos;re offline — showing saved results
        </ThemedText>
      </View>
    </Animated.View>
  );
}
