import { router } from "expo-router";
import { useEffect, useState } from "react";
import { BackHandler, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, TextButton } from "@/components/ui/button";
import { PressableScale } from "@/components/ui/pressable-scale";
import { SkeletonChips, SkeletonText } from "@/components/ui/skeleton";
import { ThemedText } from "@/components/ui/themed-text";
import {
  useTasteOnboarding,
  useTasteOptionsQuery,
  useTastePreferences,
} from "@/features/home";
import { analytics } from "@/lib/analytics";
import { cn } from "@/lib/cn";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";

const STEPS = [
  {
    group: "food",
    title: "What sounds good?",
    body: "Pick any that make you hungry.",
  },
  {
    group: "mood",
    title: "What's the vibe?",
    body: "The kind of places you like to settle into.",
  },
  {
    group: "time",
    title: "When do you usually look?",
    body: "We'll lean your feed toward those moments.",
  },
] as const;

// Each step slides in a little from the right and fades — occasional tier.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const STEP_IN = new Keyframe({
  0: { opacity: 0, transform: [{ translateX: 24 }] },
  100: { opacity: 1, transform: [{ translateX: 0 }], easing: EASE_OUT },
}).duration(260);

/**
 * First-launch taste picker: three quick steps (food, vibe, time) that shape
 * "For you" from the first minute. Shown once per user; every step can be
 * skipped, and picks save as they're made (same as the home card and the
 * Your tastes screen).
 */
export default function TasteOnboardingScreen() {
  const colors = useColors();
  const reduced = useReducedMotion();
  const options = useTasteOptionsQuery();
  const tastes = useTastePreferences();
  const onboarding = useTasteOnboarding();
  const [step, setStep] = useState(0);
  const insets = useSafeAreaInsets();

  const current = STEPS[step];
  const choices = (options.data ?? []).filter((o) => o.group === current.group);
  const pickedHere = choices.filter((o) =>
    tastes.tasteOptionIds.includes(o.id),
  ).length;
  const isLast = step === STEPS.length - 1;

  function finish(skipped: boolean) {
    analytics.track("taste_onboarding_finished", {
      picks: tastes.tasteOptionIds.length,
      skipped,
    });
    onboarding.markSeen();
    router.back();
  }

  function next() {
    if (isLast) {
      if (tastes.tasteOptionIds.length > 0) haptics.success();
      finish(false);
      return;
    }
    setStep((s) => s + 1);
  }

  // Android back steps back through the flow before leaving it.
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (step > 0) {
        setStep((s) => s - 1);
        return true;
      }
      onboarding.markSeen();
      return false;
    });
    return () => sub.remove();
  }, [step, onboarding]);

  const loading = options.isPending || !tastes.ready;

  return (
    <View
      className="flex-1 bg-background"
      // Explicit insets: in a full-screen modal SafeAreaView can measure 0 on
      // first mount and slide the header under the status bar.
      style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
    >
      <View className="flex-row items-center justify-between px-6 pt-2">
        {/* Progress: one segment per step. */}
        <View className="flex-row gap-1.5">
          {STEPS.map((s, i) => (
            <View
              key={s.group}
              style={{
                height: 6,
                borderRadius: 3,
                width: i === step ? 28 : 12,
                backgroundColor: i <= step ? colors.primary : colors.border,
              }}
            />
          ))}
        </View>
        <TextButton label="Skip" onPress={() => finish(true)} tone="muted" />
      </View>

      {loading ? (
        <View className="px-6 pb-6 pt-8">
          <SkeletonText className="w-4/5" size="3xl" />
          <View className="mt-2">
            <SkeletonText className="w-full" />
          </View>
          <View className="mt-8">
            <SkeletonChips count={8} gap={10} height={45} />
          </View>
        </View>
      ) : (
        <ScrollView
          contentContainerClassName="px-6 pb-6 pt-8"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={reduced ? FadeIn.duration(150) : STEP_IN}
            key={current.group}
          >
            <ThemedText size="3xl" tone="heading" weight="bold">
              {current.title}
            </ThemedText>
            <ThemedText className="mt-2" tone="muted">
              {current.body}
            </ThemedText>

            <View className="mt-8 flex-row flex-wrap gap-2.5">
              {choices.map((option) => {
                const selected = tastes.tasteOptionIds.includes(option.id);
                return (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    className={cn(
                      "rounded-full border px-5 py-3",
                      selected
                        ? "border-primary bg-primary"
                        : "border-border bg-surface",
                    )}
                    key={option.id}
                    onPress={() => {
                      haptics.select();
                      tastes.toggle(option.id);
                    }}
                  >
                    <ThemedText
                      tone={selected ? "inverse" : "default"}
                      weight="medium"
                    >
                      {option.name}
                    </ThemedText>
                  </PressableScale>
                );
              })}
            </View>
          </Animated.View>
        </ScrollView>
      )}

      <View className="gap-1 px-6 pb-2 pt-2">
        <Button
          disabled={loading}
          label={
            isLast
              ? tastes.tasteOptionIds.length > 0
                ? "Show my picks"
                : "Done"
              : pickedHere > 0
                ? "Next"
                : "Not really, next"
          }
          onPress={next}
        />
        {step > 0 ? (
          <Button
            label="Back"
            onPress={() => setStep((s) => s - 1)}
            size="sm"
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}
