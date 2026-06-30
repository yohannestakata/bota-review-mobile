import { useSSO, useSignUp } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { Link, router } from "expo-router";
import type { Href } from "expo-router";
import { useState } from "react";
import { Pressable, View } from "react-native";
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

const accountSchema = z.object({
  email: emailField,
  username: z.string().trim().min(3, "At least 3 characters"),
  password: z.string().min(8, "At least 8 characters"),
});

const verifySchema = z.object({
  code: z.string().trim().min(6, "Enter the 6-digit code"),
});

type AccountValues = z.infer<typeof accountSchema>;
type VerifyValues = z.infer<typeof verifySchema>;

export default function SignupScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();
  const { startSSOFlow } = useSSO();
  const [pendingVerification, setPendingVerification] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  const accountForm = useForm<AccountValues>({
    resolver: zodFormResolver(accountSchema),
    mode: "onChange",
    defaultValues: { email: "", username: "", password: "" },
  });
  const verifyForm = useForm<VerifyValues>({
    resolver: zodFormResolver(verifySchema),
    mode: "onChange",
    defaultValues: { code: "" },
  });

  const onCreateAccount = accountForm.handleSubmit(async (values) => {
    if (!isLoaded) {
      return;
    }

    try {
      await signUp.create({
        emailAddress: values.email,
        username: values.username,
        password: values.password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setPendingVerification(true);
    } catch (err) {
      accountForm.setError("root", { message: getAuthMessage(err) });
    }
  });

  const onVerify = verifyForm.handleSubmit(async ({ code }) => {
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        verifyForm.setError("root", {
          message: "That code didn't match — give it another go.",
        });
      }
    } catch (err) {
      verifyForm.setError("root", { message: getAuthMessage(err) });
    }
  });

  async function resendCode() {
    if (!isLoaded || resendLoading) {
      return;
    }

    setResendLoading(true);
    verifyForm.clearErrors();
    try {
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
    } catch (err) {
      verifyForm.setError("root", { message: getAuthMessage(err) });
    } finally {
      setResendLoading(false);
    }
  }

  function changeEmail() {
    verifyForm.reset();
    setPendingVerification(false);
  }

  async function onGooglePress() {
    if (googleLoading) {
      return;
    }

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
        accountForm.setError("root", {
          message: "That didn't go through. Mind trying again?",
        });
      }
    } catch (err) {
      debugLog("auth", "Google OAuth failed", {
        message: err instanceof Error ? err.message : "Unknown error",
      });
      accountForm.setError("root", { message: getAuthMessage(err) });
    } finally {
      setGoogleLoading(false);
    }
  }

  const rootError = pendingVerification
    ? verifyForm.formState.errors.root?.message
    : accountForm.formState.errors.root?.message;
  const accountBusy = accountForm.formState.isSubmitting || googleLoading;
  const verificationBusy = verifyForm.formState.isSubmitting || resendLoading;
  const pendingEmail = accountForm.getValues("email");

  return (
    <AuthScreen
      body={
        pendingVerification
          ? `We sent a 6-digit code to ${pendingEmail}. Enter it below to finish up.`
          : "Save the spots you love, share your takes, and help the city find its next favorite place."
      }
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
        <>
          <ControlledTextInput
            autoComplete="one-time-code"
            autoFocus
            control={verifyForm.control}
            editable={!verificationBusy}
            keyboardType="number-pad"
            label="Verification code"
            maxLength={6}
            name="code"
            onSubmitEditing={onVerify}
            placeholder="123456"
            returnKeyType="done"
            selectTextOnFocus
          />
          <View className="flex-row justify-between">
            <Pressable hitSlop={8} onPress={changeEmail}>
              <ThemedText size="sm" tone="muted" weight="medium">
                Change email
              </ThemedText>
            </Pressable>
            <Pressable
              disabled={resendLoading}
              hitSlop={8}
              onPress={resendCode}
            >
              <ThemedText size="sm" tone="brand" weight="semibold">
                {resendLoading ? "Sending…" : "Resend code"}
              </ThemedText>
            </Pressable>
          </View>
        </>
      ) : (
        <>
          <ControlledTextInput
            autoCapitalize="none"
            autoComplete="email"
            control={accountForm.control}
            editable={!accountBusy}
            keyboardType="email-address"
            label="Email"
            name="email"
            placeholder="you@example.com"
            returnKeyType="next"
          />
          <ControlledTextInput
            autoCapitalize="none"
            autoComplete="username-new"
            control={accountForm.control}
            editable={!accountBusy}
            label="Username"
            name="username"
            placeholder="yourname"
            returnKeyType="next"
          />
          <ControlledTextInput
            autoCapitalize="none"
            autoComplete="new-password"
            control={accountForm.control}
            editable={!accountBusy}
            label="Password"
            name="password"
            onSubmitEditing={onCreateAccount}
            placeholder="Choose a password"
            returnKeyType="done"
            secureTextEntry
          />
        </>
      )}
      <AuthError message={rootError} />
      <Button
        disabled={
          !isLoaded ||
          (pendingVerification
            ? !verifyForm.formState.isValid || resendLoading
            : !accountForm.formState.isValid || googleLoading)
        }
        label={pendingVerification ? "Verify email" : "Create account"}
        loading={
          pendingVerification
            ? verifyForm.formState.isSubmitting
            : accountForm.formState.isSubmitting
        }
        onPress={pendingVerification ? onVerify : onCreateAccount}
      />
      {!pendingVerification ? (
        <View className="mt-2 gap-4">
          <AuthDivider />
          <Button
            disabled={accountForm.formState.isSubmitting}
            label="Continue with Google"
            leftSlot={<GoogleMark />}
            loading={googleLoading}
            onPress={onGooglePress}
            variant="secondary"
          />
        </View>
      ) : null}
    </AuthScreen>
  );
}
