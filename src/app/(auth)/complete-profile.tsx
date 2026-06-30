import { useSignUp } from "@clerk/clerk-expo";
import { zodFormResolver } from "@/lib/zod-resolver";
import { Redirect, router } from "expo-router";
import type { Href } from "expo-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { AuthScreen } from "@/components/auth/auth-screen";
import { Button } from "@/components/ui/button";
import { ControlledTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";
import { getAuthMessage } from "@/lib/auth";
import { debugLog } from "@/lib/debug";

const completeProfileSchema = z.object({
  username: z.string().trim().min(3, "At least 3 characters"),
});

type CompleteProfileValues = z.infer<typeof completeProfileSchema>;

// Reached after a Google/OAuth sign-up for a brand-new user: the provider gives us
// an email but not a username (which this instance requires), so Clerk leaves the
// sign-up at "missing_requirements". We collect the username, finish the sign-up,
// and activate the session.
export default function CompleteProfileScreen() {
  const { isLoaded, setActive, signUp } = useSignUp();

  const { control, handleSubmit, setError, formState } =
    useForm<CompleteProfileValues>({
      resolver: zodFormResolver(completeProfileSchema),
      defaultValues: { username: "" },
    });

  const onSubmit = handleSubmit(async ({ username }) => {
    if (!isLoaded) {
      return;
    }

    try {
      const result = await signUp.update({ username });

      debugLog("complete-profile", "signUp updated", {
        missingFields: result.missingFields,
        status: result.status,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.replace("/");
      } else {
        setError("root", {
          message: `We still need a bit more to finish: ${result.missingFields.join(", ")}.`,
        });
      }
    } catch (err) {
      setError("root", { message: getAuthMessage(err) });
    }
  });

  // Guard against landing here without a pending OAuth sign-up (e.g. a stale deep
  // link or manual navigation). A user mid-flow has status "missing_requirements".
  if (isLoaded && signUp?.status !== "missing_requirements") {
    return <Redirect href={"/login" as Href} />;
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
      <ControlledTextInput
        autoCapitalize="none"
        autoComplete="username-new"
        control={control}
        label="Username"
        name="username"
        placeholder="yourname"
      />
      {formState.errors.root ? (
        <ThemedText size="sm" tone="danger">
          {formState.errors.root.message}
        </ThemedText>
      ) : null}
      <Button
        label="Finish"
        loading={formState.isSubmitting}
        onPress={onSubmit}
      />
    </AuthScreen>
  );
}
