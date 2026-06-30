import { useAuth } from "@clerk/clerk-expo";
import { colors } from "@/lib/theme";
import {
  FavouriteIcon,
  Home01Icon,
  Note01Icon,
  Search01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { Tabs } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { AppLoadingSkeleton } from "@/components/app-loading-skeleton";
import { getCurrentUser } from "@/lib/api";
import { debugLog } from "@/lib/debug";

type SyncState = "pending" | "ready" | "error";

// Fixed, uniform icon size for every tab.
const TAB_ICON_SIZE = 25;
const TAB_ACTIVE_COLOR = colors.primary;
const TAB_INACTIVE_COLOR = colors.muted;

function TabsLoadingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <AppLoadingSkeleton />
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const { getToken, isLoaded, isSignedIn, userId } = useAuth();
  const getTokenRef = useRef(getToken);
  const [syncState, setSyncState] = useState<SyncState>("pending");
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const retry = useCallback(() => {
    setSyncState("pending");
    setRetryKey((key) => key + 1);
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function syncUser() {
      if (!isLoaded) {
        debugLog("tabs", "waiting for Clerk session", {
          isLoaded,
          isSignedIn,
        });
        setSyncState("pending");
        return;
      }

      if (!isSignedIn) {
        debugLog("tabs", "continuing with anonymous session");
        setSyncState("ready");
        return;
      }

      try {
        const user = await getCurrentUser(getTokenRef.current);
        debugLog("tabs", "backend user synced", {
          role: user.role,
          status: user.status,
          trustLevel: user.trustLevel,
        });
        if (isMounted) {
          setSyncState("ready");
        }
      } catch (error) {
        // The Clerk session is valid but the backend rejected the token (or is
        // unreachable). Surface it instead of failing open — entering the app
        // here would silently mask a broken Clerk↔backend integration.
        debugLog("tabs", "backend user sync failed", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        if (isMounted) {
          setSyncState("error");
        }
      }
    }

    void syncUser();

    return () => {
      isMounted = false;
    };
  }, [isLoaded, isSignedIn, retryKey, userId]);

  if (!isLoaded) {
    return <TabsLoadingScreen />;
  }

  if (isSignedIn && syncState === "error") {
    return (
      <SafeAreaView className="flex-1 bg-background">
        <View className="flex-1 items-center justify-center gap-3 px-6">
          <ThemedText size="lg" weight="medium">
            Hang on a sec…
          </ThemedText>
          <ThemedText className="text-center" tone="muted">
            You&apos;re signed in, but we couldn&apos;t load your profile. Mind
            checking your connection and trying again?
          </ThemedText>
          <Pressable onPress={retry}>
            <ThemedText tone="brand" weight="semibold">
              Try again
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (syncState !== "ready") {
    return <TabsLoadingScreen />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: TAB_ACTIVE_COLOR,
        tabBarInactiveTintColor: TAB_INACTIVE_COLOR,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          height: 86,
          paddingTop: 8,
          paddingBottom: 22,
        },
        tabBarLabelStyle: {
          fontFamily: "Outfit-Medium",
          fontSize: 12,
          lineHeight: 16,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => (
            <AppIcon
              color={color as string}
              icon={Home01Icon}
              size={TAB_ICON_SIZE}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => (
            <AppIcon
              color={color as string}
              icon={Search01Icon}
              size={TAB_ICON_SIZE}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="saved"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => (
            <AppIcon
              color={color as string}
              icon={FavouriteIcon}
              size={TAB_ICON_SIZE}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="submissions"
        options={{
          title: "Submissions",
          tabBarIcon: ({ color }) => (
            <AppIcon
              color={color as string}
              icon={Note01Icon}
              size={TAB_ICON_SIZE}
            />
          ),
        }}
      />
      {/* Dev-only screen — kept in the project but hidden from the tab bar. */}
      <Tabs.Screen name="test" options={{ href: null }} />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <AppIcon
              color={color as string}
              icon={UserCircleIcon}
              size={TAB_ICON_SIZE}
            />
          ),
        }}
      />
    </Tabs>
  );
}
