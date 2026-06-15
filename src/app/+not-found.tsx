import { useAuth } from "@clerk/clerk-expo";
import { Redirect } from "expo-router";
import { useEffect } from "react";

import { debugLog } from "@/lib/debug";

export default function NotFoundScreen() {
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    debugLog("not-found", "state changed", {
      isLoaded,
      isSignedIn,
    });
  }, [isLoaded, isSignedIn]);

  if (!isLoaded) {
    return null;
  }

  return <Redirect href={isSignedIn ? "/" : "/login"} />;
}
