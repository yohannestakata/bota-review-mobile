import "../../global.css";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { QueryClientProvider } from "@tanstack/react-query";
import { useFonts } from "expo-font";
import { ObserveRoot, useObserve } from "expo-observe";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Linking, StatusBar } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AnalyticsProvider } from "@/components/analytics-provider";
import { AlertProvider } from "@/components/ui/alert";
import { debugLog } from "@/lib/debug";
import { queryClient } from "@/lib/query-client";
import { colors } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();
void WebBrowser.maybeCompleteAuthSession();

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

function RootLayout() {
  const { markInteractive } = useObserve();
  const [fontsLoaded] = useFonts({
    "Outfit-Black": require("../../assets/fonts/Outfit-Black.ttf"),
    "Outfit-Bold": require("../../assets/fonts/Outfit-Bold.ttf"),
    "Outfit-ExtraBold": require("../../assets/fonts/Outfit-ExtraBold.ttf"),
    "Outfit-ExtraLight": require("../../assets/fonts/Outfit-ExtraLight.ttf"),
    "Outfit-Light": require("../../assets/fonts/Outfit-Light.ttf"),
    "Outfit-Medium": require("../../assets/fonts/Outfit-Medium.ttf"),
    "Outfit-Regular": require("../../assets/fonts/Outfit-Regular.ttf"),
    "Outfit-SemiBold": require("../../assets/fonts/Outfit-SemiBold.ttf"),
    "Outfit-Thin": require("../../assets/fonts/Outfit-Thin.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      debugLog("root", "fonts loaded");
      void SplashScreen.hideAsync();
      // App is ready to render and accept input — mark Time to Interactive.
      markInteractive();
    }
  }, [fontsLoaded, markInteractive]);

  useEffect(() => {
    void Linking.getInitialURL().then((url) => {
      debugLog("linking", "initial URL", { url: url ?? null });
    });

    const subscription = Linking.addEventListener("url", ({ url }) => {
      debugLog("linking", "incoming URL", { url });
    });

    return () => {
      subscription.remove();
    };
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
        >
          <AnalyticsProvider>
            <QueryClientProvider client={queryClient}>
              <BottomSheetModalProvider>
                <AlertProvider>
                  <StatusBar barStyle="dark-content" />
                  <Stack
                    screenOptions={{
                      contentStyle: { backgroundColor: colors.background },
                      headerShown: false,
                    }}
                  />
                </AlertProvider>
              </BottomSheetModalProvider>
            </QueryClientProvider>
          </AnalyticsProvider>
        </ClerkProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default ObserveRoot.wrap(RootLayout);
