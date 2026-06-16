import { useSignUp } from "@clerk/clerk-expo";
import { Redirect, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";

import { AuthField, AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { getAuthMessage } from "@/lib/auth";
import { debugLog } from "@/lib/debug";

// Reached after a Google/OAuth sign-up for a brand-new user: the provider gives us
// an email but not a username (which this instance requires), so Clerk leaves the
// sign-up at "missing_requirements". We collect the username, finish the sign-up,
// and activate the session.
export default function CompleteProfileScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard against landing here without a pending OAuth sign-up (e.g. a stale deep
  // link or manual navigation). A user mid-flow has status "missing_requirements".
  if (isLoaded && signUp?.status !== "missing_requirements") {
    return <Redirect href={"/login" as Href} />;
  }

  async function onSubmit() {
    if (!isLoaded || loading) {
      return;
    }

    setError("");
    setLoading(true);

    try {
      const result = await signUp.update({ username: username.trim() });

      debugLog("complete-profile", "signUp updated", {
        missingFields: result.missingFields,
        status: result.status,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError(
          `We still need a bit more to finish: ${result.missingFields.join(", ")}.`,
        );
      }
    } catch (err) {
      setError(getAuthMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthScreen
      body="Pick a username so people can find you. This is the last step."
      eyebrow="Almost there"
      footer={
        <ThemedText className="text-center" tone="muted">
          This finishes setting up your account.
        </ThemedText>
      }
      title="Choose a username"
    >
      <AuthField
        autoComplete="username-new"
        label="Username"
        onChangeText={setUsername}
        placeholder="yourname"
        value={username}
      />
      {error ? (
        <ThemedText size="sm" tone="brand">
          {error}
        </ThemedText>
      ) : null}
      <Button label="Finish" loading={loading} onPress={onSubmit} />
    </AuthScreen>
  );
}
