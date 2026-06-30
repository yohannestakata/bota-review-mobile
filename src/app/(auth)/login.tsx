import { useSSO, useSignIn } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { Link, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import { AuthDivider, AuthError } from "@/components/auth/auth-feedback";
import { GoogleMark } from "@/components/auth/google-mark";
import { Button } from "@/components/ui/button";
import { ControlledTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import {
  getAuthMessage,
  logOAuthRedirectCandidates,
  oauthRedirectUrl,
} from "@/lib/auth";
import { debugLog } from "@/lib/debug";
import { emailField } from "@/lib/validation";

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function LoginScreen() {
  const { isLoaded, setActive, signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [googleLoading, setGoogleLoading] = useState(false);

  const { control, handleSubmit, setError, formState } = useForm<LoginValues>({
    resolver: zodFormResolver(loginSchema),
    mode: "onChange",
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signIn.create({
        identifier: values.email,
        password: values.password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("root", {
          message:
            "We need one more verification step before you can continue.",
        });
      }
    } catch (err) {
      setError("root", { message: getAuthMessage(err) });
    }
  });

  async function onGooglePress() {
    if (googleLoading) {
      return;
    }

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
        setError("root", {
          message: "That didn't go through. Mind trying again?",
        });
      }
    } catch (err) {
      debugLog("auth", "Google OAuth failed", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      setError("root", { message: getAuthMessage(err) });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreen
      body="Pick up right where you left off — your saved spots and reviews are waiting."
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
      <ControlledTextInput
        autoCapitalize="none"
        autoComplete="email"
        control={control}
        editable={!googleLoading && !formState.isSubmitting}
        keyboardType="email-address"
        label="Email"
        name="email"
        placeholder="you@example.com"
        returnKeyType="next"
      />
      <ControlledTextInput
        autoCapitalize="none"
        autoComplete="password"
        control={control}
        editable={!googleLoading && !formState.isSubmitting}
        label="Password"
        name="password"
        onSubmitEditing={onSubmit}
        placeholder="Your password"
        returnKeyType="done"
        secureTextEntry
      />
      <AuthError message={formState.errors.root?.message} />
      <Button
        disabled={!isLoaded || !formState.isValid || googleLoading}
        label="Log in"
        loading={formState.isSubmitting}
        onPress={onSubmit}
      />
      <View className="mt-2 gap-4">
        <AuthDivider />
        <Button
          disabled={formState.isSubmitting}
          label="Continue with Google"
          leftSlot={<GoogleMark />}
          loading={googleLoading}
          onPress={onGooglePress}
          variant="secondary"
        />
      </View>
    </AuthScreen>
  );
}
