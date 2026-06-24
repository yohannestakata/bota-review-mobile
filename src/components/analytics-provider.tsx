import { useAuth } from "@clerk/clerk-expo";
import { PostHog, PostHogProvider } from "posthog-react-native";
import { useEffect, type ReactNode } from "react";

import { analytics } from "@/lib/analytics";
import { debugLog } from "@/lib/debug";

// Name matches what `eas integrations:posthog:connect` writes, so the EAS
// integration and local `.env` stay interchangeable.
const POSTHOG_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST =
  process.env.EXPO_PUBLIC_POSTHOG_HOST ?? "https://us.i.posthog.com";

// Constructed once at module load. Null when no key is configured — the
// internal-table layer still works, only the PostHog layer is skipped.
// Session replay is on with conservative masking (text inputs + images hidden)
// — loosen `sessionReplayConfig` if you need more visible recordings.
const posthogClient = POSTHOG_KEY
  ? new PostHog(POSTHOG_KEY, {
      host: POSTHOG_HOST,
      enableSessionReplay: true,
      sessionReplayConfig: {
        maskAllTextInputs: true,
        maskAllImages: true,
        captureLog: true,
        captureNetworkTelemetry: true,
      },
    })
  : null;

if (!POSTHOG_KEY) {
  debugLog(
    "analytics",
    "EXPO_PUBLIC_POSTHOG_API_KEY missing — PostHog disabled",
  );
}

// Keeps the analytics singleton in sync with Clerk: a fresh token getter for
// internal-table auth resolution, and identify/reset on sign-in/out.
function AnalyticsBridge({ children }: { children: ReactNode }) {
  const { getToken, isSignedIn, userId } = useAuth();

  useEffect(() => {
    analytics.setClient(posthogClient);
  }, []);

  useEffect(() => {
    analytics.setTokenGetter(getToken);
  }, [getToken]);

  useEffect(() => {
    if (isSignedIn && userId) {
      analytics.identify(userId);
    } else {
      analytics.reset();
    }
  }, [isSignedIn, userId]);

  return <>{children}</>;
}

export function AnalyticsProvider({ children }: { children: ReactNode }) {
  if (!posthogClient) {
    return <AnalyticsBridge>{children}</AnalyticsBridge>;
  }

  return (
    <PostHogProvider client={posthogClient} autocapture={false}>
      <AnalyticsBridge>{children}</AnalyticsBridge>
    </PostHogProvider>
  );
}
