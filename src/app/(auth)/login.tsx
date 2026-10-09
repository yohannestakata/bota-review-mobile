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
import { PressableFade } from "@/components/ui/pressable-scale";
import { ThemedText } from "@/components/ui/themed-text";
import {
  getAuthMessage,
  isAlreadySignedInError,
  logOAuthRedirectCandidates,
  oauthRedirectUrl,
} from "@/lib/auth";
import { debugLog } from "@/lib/debug";
import { emailField } from "@/lib/validation";
import { analytics } from "@/lib/analytics";

const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "Enter your password"),
});

type LoginValues = z.infer<typeof loginSchema>;

const codeSchema = z.object({
  code: z.string().trim().min(6, "Enter the 6-digit code"),
});

type CodeValues = z.infer<typeof codeSchema>;

export default function LoginScreen() {
  const { isLoaded, setActive, signIn } = useSignIn();
  const { startSSOFlow } = useSSO();
  const [googleLoading, setGoogleLoading] = useState(false);
  // Signing in on a new device: Clerk emails a code to confirm it's them.
  const [codeSentTo, setCodeSentTo] = useState<string | null>(null);

  const { control, handleSubmit, setError, setFocus, formState } =
    useForm<LoginValues>({
      resolver: zodFormResolver(loginSchema),
      mode: "onChange",
      defaultValues: { email: "", password: "" },
    });
  const codeForm = useForm<CodeValues>({
    resolver: zodFormResolver(codeSchema),
    mode: "onChange",
    defaultValues: { code: "" },
  });

  async function finish(sessionId: string | null) {
    await setActive?.({ session: sessionId });
    analytics.track("signed_in", { method: "email" });
    router.replace("/");
  }

  const onSubmit = handleSubmit(async (values) => {
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signIn.create({
        identifier: values.email,
        password: values.password,
      });

      const emailFactor = result.supportedSecondFactors?.find(
        (factor) => factor.strategy === "email_code",
      );
      if (result.status === "complete") {
        await finish(result.createdSessionId);
      } else if (result.status === "needs_second_factor" && emailFactor) {
        await signIn.prepareSecondFactor({
          strategy: "email_code",
          emailAddressId: emailFactor.emailAddressId,
        });
        setCodeSentTo(emailFactor.safeIdentifier);
      } else {
        setError("root", {
          message:
            "We need one more verification step before you can continue.",
        });
      }
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        router.replace("/");
        return;
      }
      setError("root", { message: getAuthMessage(err) });
    }
  });

  const onVerify = codeForm.handleSubmit(async ({ code }) => {
    if (!isLoaded) {
      return;
    }
    try {
      const result = await signIn.attemptSecondFactor({
        strategy: "email_code",
        code,
      });
      if (result.status === "complete") {
        await finish(result.createdSessionId);
      } else {
        codeForm.setError("root", {
          message: "That code didn't match. Give it another go.",
        });
      }
    } catch (err) {
      codeForm.setError("root", { message: getAuthMessage(err) });
    }
  });

  async function resendCode() {
    const emailFactor = signIn?.supportedSecondFactors?.find(
      (factor) => factor.strategy === "email_code",
    );
    if (!emailFactor) return;
    try {
      await signIn?.prepareSecondFactor({
        strategy: "email_code",
        emailAddressId: emailFactor.emailAddressId,
      });
    } catch (err) {
      codeForm.setError("root", { message: getAuthMessage(err) });
    }
  }

  if (codeSentTo) {
    return (
      <AuthScreen
        body={`We sent a 6-digit code to ${codeSentTo} to confirm it's you on this device.`}
        footer={null}
        title="Check your email"
      >
        <ControlledTextInput
          key="code"
          autoComplete="one-time-code"
          autoFocus
          control={codeForm.control}
          editable={!codeForm.formState.isSubmitting}
          keyboardType="number-pad"
          label="Verification code"
          maxLength={6}
          name="code"
          onSubmitEditing={onVerify}
          placeholder="123456"
          returnKeyType="done"
        />
        <View className="flex-row justify-between">
          <PressableFade hitSlop={8} onPress={() => setCodeSentTo(null)}>
            <ThemedText size="sm" tone="muted" weight="medium">
              Back
            </ThemedText>
          </PressableFade>
          <PressableFade hitSlop={8} onPress={resendCode}>
            <ThemedText size="sm" tone="brand" weight="semibold">
              Resend code
            </ThemedText>
          </PressableFade>
        </View>
        <AuthError message={codeForm.formState.errors.root?.message} />
        <Button
          disabled={!isLoaded || !codeForm.formState.isValid}
          label="Log in"
          loading={codeForm.formState.isSubmitting}
          onPress={onVerify}
        />
      </AuthScreen>
    );
  }

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
        analytics.track("signed_in", { method: "google" });
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
      if (isAlreadySignedInError(err)) {
        router.replace("/");
        return;
      }
      setError("root", { message: getAuthMessage(err) });
    } finally {
      setGoogleLoading(false);
    }
  }

  return (
    <AuthScreen
      body="Pick up right where you left off. Your saved spots and reviews are waiting."
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
        onSubmitEditing={() => setFocus("password")}
        placeholder="you@example.com"
        returnKeyType="next"
        submitBehavior="submit"
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
