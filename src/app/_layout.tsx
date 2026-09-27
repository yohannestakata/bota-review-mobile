import "../../global.css";
import { ClerkProvider } from "@clerk/clerk-expo";
import { tokenCache } from "@clerk/clerk-expo/token-cache";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { useFonts } from "expo-font";
import * as Notifications from "expo-notifications";
import { ObserveRoot, useObserve } from "expo-observe";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import * as WebBrowser from "expo-web-browser";
import { useEffect } from "react";
import { Linking, StatusBar, useColorScheme } from "react-native";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { AnalyticsProvider } from "@/components/analytics-provider";
import { PushRegistration } from "@/components/push-registration";
import { AlertProvider } from "@/components/ui/alert";
import { ToastProvider } from "@/components/ui/toast";
import { OfflineBanner } from "@/components/offline-banner";
import { PhotoSourceHost } from "@/components/photo-source-host";
import { debugLog } from "@/lib/debug";
import { routeFromNotification } from "@/lib/notification-routing";
import { queryClient } from "@/lib/query-client";
import {
  ClearCacheOnSignOut,
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
  queryPersister,
  shouldPersistQuery,
} from "@/lib/query-persistence";
import { useColors } from "@/lib/theme";

void SplashScreen.preventAutoHideAsync();
void WebBrowser.maybeCompleteAuthSession();

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

const clerkPublishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

if (!clerkPublishableKey) {
  throw new Error("Missing EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY");
}

function RootLayout() {
  const colors = useColors();
  // Re-render the tree (and colors.* reads) when the system scheme changes.
  const scheme = useColorScheme();
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

  useEffect(() => {
    function openNotification(response: Notifications.NotificationResponse) {
      routeFromNotification(response.notification.request.content.data);
    }

    void Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) openNotification(response);
    });
    const subscription =
      Notifications.addNotificationResponseReceivedListener(openNotification);
    return () => subscription.remove();
  }, []);

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background }}
    >
      <KeyboardProvider>
        <ClerkProvider
          publishableKey={clerkPublishableKey}
          tokenCache={tokenCache}
        >
          <AnalyticsProvider>
            {/* Restores the last session's data from disk on launch, so
                screens open filled in and refresh in the background. */}
            <PersistQueryClientProvider
              client={queryClient}
              persistOptions={{
                persister: queryPersister,
                maxAge: PERSIST_MAX_AGE,
                buster: PERSIST_BUSTER,
                dehydrateOptions: { shouldDehydrateQuery: shouldPersistQuery },
              }}
            >
              <ClearCacheOnSignOut />
              <BottomSheetModalProvider>
                <AlertProvider>
                  <ToastProvider>
                    <PushRegistration />
                    <StatusBar
                      barStyle={
                        scheme === "dark" ? "light-content" : "dark-content"
                      }
                    />
                    <Stack
                      screenOptions={{
                        contentStyle: { backgroundColor: colors.background },
                        headerShown: false,
                      }}
                    >
                      {/* Fades in over the page, which stays visible beneath
                          so dragging a photo down to close reveals it. */}
                      {/* First-launch taste picker: slides up over the tabs. */}
                      <Stack.Screen
                        name="onboarding/tastes"
                        options={{
                          gestureEnabled: false,
                          presentation: "fullScreenModal",
                        }}
                      />
                      <Stack.Screen
                        name="branch/[id]/photos"
                        options={{
                          animation: "fade",
                          contentStyle: { backgroundColor: "transparent" },
                          presentation: "transparentModal",
                        }}
                      />
                    </Stack>
                    <OfflineBanner />
                    <PhotoSourceHost />
                  </ToastProvider>
                </AlertProvider>
              </BottomSheetModalProvider>
            </PersistQueryClientProvider>
          </AnalyticsProvider>
        </ClerkProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

export default ObserveRoot.wrap(RootLayout);
