import { useSSO, useSignUp } from "@clerk/clerk-expo";
import { Link, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";

import { AuthField, AuthScreen } from "@/components/auth/auth-screen";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import {
  getAuthMessage,
  logOAuthRedirectCandidates,
  oauthRedirectUrl,
} from "@/lib/auth";
import { debugLog } from "@/lib/debug";

export default function SignupScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [emailAddress, setEmailAddress] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [pendingVerification, setPendingVerification] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function onCreateAccount() {
    if (!isLoaded || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      await signUp.create({
        emailAddress: emailAddress.trim(),
        username: username.trim(),
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
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
        screen: "signup",
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
        setError("That didn't go through. Mind trying again?");
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

  async function onVerify() {
    if (!isLoaded || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("That code didn't match — give it another go.");
      }
    } catch (err) {
      setError(getAuthMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      body={
        pendingVerification
          ? "We sent a code to your email — pop it in to finish up."
          : "Save the spots you love, share your takes, and help the city find its next favorite place."
      }
      eyebrow={pendingVerification ? "Check your email" : "Join Bota"}
      footer={
        <ThemedText className="text-center" tone="muted">
          Already have an account?{" "}
          <Link href={"/login" as Href}>
            <ThemedText tone="brand" weight="semibold">
              Log in
            </ThemedText>
          </Link>
        </ThemedText>
      }
      title={pendingVerification ? "Verify your email" : "Create your account"}
    >
      {pendingVerification ? (
        <AuthField
          autoComplete="one-time-code"
          keyboardType="number-pad"
          label="Verification code"
          onChangeText={setCode}
          placeholder="123456"
          value={code}
        />
      ) : (
        <>
          <AuthField
            autoComplete="email"
            keyboardType="email-address"
            label="Email"
            onChangeText={setEmailAddress}
            placeholder="you@example.com"
            value={emailAddress}
          />
          <AuthField
            autoComplete="username-new"
            label="Username"
            onChangeText={setUsername}
            placeholder="yourname"
            value={username}
          />
          <AuthField
            autoComplete="new-password"
            label="Password"
            onChangeText={setPassword}
            placeholder="Choose a password"
            secureTextEntry
            value={password}
          />
        </>
      )}
      {error ? (
        <ThemedText size="sm" tone="brand">
          {error}
        </ThemedText>
      ) : null}
      {!pendingVerification ? (
        <Button
          label="Continue with Google"
          leftSlot={<GoogleMark />}
          loading={googleLoading}
          onPress={onGooglePress}
          variant="secondary"
        />
      ) : null}
      <Button
        label={pendingVerification ? "Verify email" : "Create account"}
        loading={loading}
        onPress={pendingVerification ? onVerify : onCreateAccount}
      />
    </AuthScreen>
  );
}
