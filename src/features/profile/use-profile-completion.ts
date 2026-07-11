import { useUser } from "@clerk/clerk-expo";
import * as Location from "expo-location";
import { router } from "expo-router";
import { useCallback, useEffect, useState } from "react";

import { useSavedBranchIds } from "@/features/home";

import { useMyReviews } from "./queries";

export type CompletionStep = {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  // The action to complete it (absent for the always-done sign-up step).
  action?: { label: string; onPress: () => void };
};

// Derives the profile-completion checklist entirely from existing client state —
// no backend. Steps ramp from identity → discovery → curation → the first review.
export function useProfileCompletion() {
  const { user } = useUser();
  const { data: savedIds } = useSavedBranchIds();
  const reviews = useMyReviews();

  const [locationGranted, setLocationGranted] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    void Location.getForegroundPermissionsAsync().then((permission) => {
      if (active) setLocationGranted(permission.granted);
    });
    return () => {
      active = false;
    };
  }, []);

  const requestLocation = useCallback(async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    setLocationGranted(permission.granted);
  }, []);

  const profileComplete = Boolean(
    user?.hasImage && (user?.username || user?.firstName || user?.fullName),
  );
  const savedFirst = (savedIds?.size ?? 0) > 0;
  const reviewedFirst = (reviews.data?.length ?? 0) > 0;

  const steps: CompletionStep[] = [
    {
      key: "signup",
      label: "Create your account",
      hint: "You're in.",
      done: true,
    },
    {
      key: "profile",
      label: "Complete your profile",
      hint: "Add a photo and your name.",
      done: profileComplete,
      action: {
        label: "Edit profile",
        onPress: () => router.push("/profile/edit"),
      },
    },
    {
      key: "location",
      label: "Turn on location",
      hint: "See what's good near you.",
      done: locationGranted === true,
      action: { label: "Turn on", onPress: () => void requestLocation() },
    },
    {
      key: "save",
      label: "Save your first spot",
      hint: "Bookmark a place you like.",
      done: savedFirst,
      action: { label: "Browse", onPress: () => router.push("/") },
    },
    {
      key: "review",
      label: "Write your first review",
      hint: "Share a hot take.",
      done: reviewedFirst,
      action: { label: "Find a place", onPress: () => router.push("/") },
    },
  ];

  const doneCount = steps.filter((step) => step.done).length;
  const total = steps.length;

  return {
    steps,
    doneCount,
    total,
    complete: doneCount === total,
    nextStep: steps.find((step) => !step.done),
  };
}
