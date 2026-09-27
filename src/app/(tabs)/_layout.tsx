import { useAuth, useClerk } from "@clerk/clerk-expo";
import { useColors } from "@/lib/theme";
import {
  FavouriteIcon,
  Home01Icon,
  Logout01Icon,
  Note01Icon,
  Search01Icon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { router, Tabs } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { AppLoadingSkeleton } from "@/components/app-loading-skeleton";
import { useIsRestoring } from "@tanstack/react-query";
import { useTasteOnboarding, useTastePreferences } from "@/features/home";
import { useMe } from "@/features/profile";
import { debugLog } from "@/lib/debug";
import { clearPushRegistration } from "@/lib/push-registration";

type SyncState = "pending" | "ready" | "error";

// Fixed, uniform icon size for every tab.
const TAB_ICON_SIZE = 25;

function TabsLoadingScreen() {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <AppLoadingSkeleton />
    </SafeAreaView>
  );
}

export default function TabLayout() {
  const colors = useColors();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { signOut } = useClerk();
  const getTokenRef = useRef(getToken);
  const [loggingOut, setLoggingOut] = useState(false);
  // The backend user (GET /me, which also creates it on first sign-in). It's
  // persisted with the rest of the cache, so once this phone has synced a user
  // the tabs open instantly on later launches and re-sync in the background —
  // no waiting on the network (or a cold server) just to enter the app.
  const me = useMe();
  const isRestoring = useIsRestoring();
  const tastes = useTastePreferences();
  const onboarding = useTasteOnboarding();

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  const retry = useCallback(() => {
    void me.refetch();
  }, [me]);

  const logout = useCallback(async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await clearPushRegistration(getTokenRef.current);
      await signOut();
      router.replace("/login");
    } catch {
      setLoggingOut(false);
    }
  }, [loggingOut, signOut]);

  useEffect(() => {
    if (me.isError) {
      debugLog("tabs", "backend user sync failed", {
        message: me.error instanceof Error ? me.error.message : "Unknown",
        hasCachedUser: Boolean(me.data),
      });
    }
  }, [me.isError, me.error, me.data]);

  // First launch after signing in, with no tastes picked yet: offer the
  // three-step taste picker once. Tastes live on the account, so someone who
  // set them on another phone isn't asked again.
  const shouldOnboard =
    isSignedIn === true &&
    Boolean(me.data) &&
    tastes.ready &&
    onboarding.ready &&
    !onboarding.seen &&
    tastes.tasteOptionIds.length === 0;
  const onboardingOpened = useRef(false);
  useEffect(() => {
    if (!shouldOnboard || onboardingOpened.current) return;
    onboardingOpened.current = true;
    router.push("/onboarding/tastes");
  }, [shouldOnboard]);

  // Signed out: browse anonymously. Signed in: enter once we have the backend
  // user, fresh or from the last session.
  const syncState: SyncState = !isSignedIn
    ? "ready"
    : me.data
      ? "ready"
      : me.isError
        ? "error"
        : "pending";

  if (!isLoaded || isRestoring) {
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
          <View className="mt-2 w-full gap-1">
            <Button
              disabled={loggingOut}
              label="Try again"
              onPress={retry}
              size="xs"
            />
            <Button
              icon={Logout01Icon}
              label="Log out"
              loading={loggingOut}
              onPress={() => void logout()}
              size="xs"
              variant="ghost"
            />
          </View>
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
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
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
