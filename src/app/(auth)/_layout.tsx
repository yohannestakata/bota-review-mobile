import { useAuth } from "@clerk/clerk-expo";
import { Redirect, Stack } from "expo-router";
import { useEffect } from "react";

import { debugLog } from "@/lib/debug";

export default function AuthLayout() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    debugLog("auth-layout", "state changed", {
      isLoaded,
      isSignedIn,
    });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return null;
  }

  if (isSignedIn) {
    return <Redirect href="/" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
