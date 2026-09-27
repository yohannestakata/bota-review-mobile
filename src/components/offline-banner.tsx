import { WifiDisconnected02Icon } from "@hugeicons/core-free-icons";
import { onlineManager } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { startConnectivityMonitoring } from "@/lib/connectivity";
import { useColors } from "@/lib/theme";

startConnectivityMonitoring();

// A slim pill near the bottom while the device is offline, so screens
// showing cached data explain themselves instead of silently not updating.
export function OfflineBanner() {
  const colors = useColors();
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
          You&apos;re offline. Showing saved results.
        </ThemedText>
      </View>
    </Animated.View>
  );
}
