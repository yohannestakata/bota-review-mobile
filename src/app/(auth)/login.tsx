import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";

import {
  AuthButton,
  AuthField,
  AuthScreen,
  AuthSecondaryButton,
} from "@/components/auth/auth-screen";
import { GoogleMark } from "@/components/auth/google-mark";
import { ThemedText } from "@/components/ui/themed-text";
import {
  getAuthMessage,
  logOAuthRedirectCandidates,
  oauthRedirectUrl,
} from "@/lib/auth";
import { debugLog } from "@/lib/debug";

export default function LoginScreen() {
  const { isLoaded, setActive, signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [emailAddress, setEmailAddress] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onSubmit() {
    if (!isLoaded || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: emailAddress.trim(),
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("We need one more verification step before you can continue.");
      }
    } catch (err) {
      setError(getAuthMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function onGooglePress() {
    if (googleLoading) {
      return;
    }

    setError("");
    setGoogleLoading(true);

    try {
      debugLog("auth", "starting Google OAuth", {
        redirectUrl: oauthRedirectUrl,
        screen: "login",
      });
      logOAuthRedirectCandidates();

      const result = await startSSOFlow({
        redirectUrl: oauthRedirectUrl,
        strategy: "oauth_google",
      });
      const { createdSessionId, setActive: activate } = result;

      debugLog("auth", "Google OAuth returned", {
        authSessionType: result.authSessionResult?.type,
        hasCreatedSessionId: Boolean(createdSessionId),
        hasSetActive: Boolean(activate),
        signInStatus: result.signIn?.status,
        signUpStatus: result.signUp?.status,
      });

      if (createdSessionId && activate) {
        await activate({ session: createdSessionId });
        router.replace("/");
      } else if (result.signUp?.status === "missing_requirements") {
        // New user: Google gave us an email but not the username this instance
        // requires. Finish the sign-up on the next screen.
        router.push("/complete-profile" as Href);
      } else {
        setError("Google sign in returned without a session. Check the logs.");
      }
    } catch (err) {
      debugLog("auth", "Google OAuth failed", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      setError(getAuthMessage(err));
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreen
      body="Sign in to keep your saved places, reviews, and submissions synced."
      eyebrow="Welcome back"
      footer={
        <ThemedText className="text-center" tone="muted">
          New here?{" "}
          <Link href={"/signup" as Href}>
            <ThemedText tone="brand" weight="semibold">
              Create an account
            </ThemedText>
          </Link>
        </ThemedText>
      }
      title="Log in to Bota"
    >
      <AuthField
        autoComplete="email"
        keyboardType="email-address"
        label="Email"
        onChangeText={setEmailAddress}
        placeholder="you@example.com"
        value={emailAddress}
      />
      <AuthField
        autoComplete="password"
        label="Password"
        onChangeText={setPassword}
        placeholder="Your password"
        secureTextEntry
        value={password}
      />
      {error ? (
        <ThemedText size="sm" tone="brand">
          {error}
        </ThemedText>
      ) : null}
      <AuthSecondaryButton
        icon={<GoogleMark />}
        label="Continue with Google"
        loading={googleLoading}
        onPress={onGooglePress}
      />
      <AuthButton label="Log in" loading={loading} onPress={onSubmit} />
    </AuthScreen>
  );
}
