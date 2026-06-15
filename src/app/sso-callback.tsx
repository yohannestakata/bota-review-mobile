import { useAuth } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ui/themed-text";
import { debugLog } from "@/lib/debug";

export default function SsoCallbackScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    debugLog("sso-callback", "state changed", {
      isLoaded,
      isSignedIn,
    });
  }, [isLoaded, isSignedIn]);

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-1 items-center justify-center px-6">
        <ThemedText size="lg" weight="medium">
          Finishing sign in...
        </ThemedText>
      </View>
    </SafeAreaView>
  );
}
