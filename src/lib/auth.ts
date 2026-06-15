import * as AuthSession from "expo-auth-session";

import { debugLog } from "@/lib/debug";

// Clerk's Expo SSO flow round-trips the OAuth redirect through expo-web-browser's
// auth session. The redirect URL must be the one expo-auth-session generates for
// the current runtime (dev client / standalone build) so the in-app browser hands
// the result back to startSSOFlow. A hand-built Linking.createURL("/oauth-native-
// callback") does not match what the auth session waits for, so the redirect leaks
// to the deep-link handler — leaving startSSOFlow hung and the app stuck on the
// callback screen. makeRedirectUri() produces the correct, environment-aware URL.
//
// A `path` is given (rather than the bare `mobile://` scheme root) because the
// Expo dev client treats a bare-scheme redirect as a fresh launch — reloading the
// JS bundle and discarding the pending startSSOFlow promise before setActive runs,
// which bounces the user back to login. A pathed redirect routes into the running
// app instead.
export const oauthRedirectUrl = AuthSession.makeRedirectUri({
  scheme: "mobile",
  path: "oauth-native-callback",
});

debugLog("auth", "OAuth redirect URL created", {
  oauthRedirectUrl,
});

export function logOAuthRedirectCandidates() {
  debugLog("auth", "OAuth redirect candidates", {
    selected: oauthRedirectUrl,
  });
}

// Clerk surfaces validation/auth failures as an `errors` array on the thrown
// object. Pull out the most descriptive message for display.
export function getAuthMessage(error: unknown) {
  if (
    typeof error === "object" &&
    error !== null &&
    "errors" in error &&
    Array.isArray(error.errors)
  ) {
    const firstError = error.errors[0] as {
      longMessage?: string;
      message?: string;
    };
    return firstError.longMessage || firstError.message || "Something went wrong";
  }

  return "Something went wrong";
}
