import { ArrowRight01Icon, Tick02Icon } from "@hugeicons/core-free-icons";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

import { useProfileCompletion } from "../use-profile-completion";

// A progress card that nudges new users through their first key actions, ending
// at their first review. Renders nothing once every step is done.
export function ProfileCompletionCard() {
  const { steps, doneCount, total, complete, nextStep } =
    useProfileCompletion();

  if (complete) return null;

  return (
    <View className="mt-5 gap-3 rounded-2xl border border-placeholder bg-surface p-4">
      <View className="flex-row items-center justify-between">
        <ThemedText weight="semibold">Get set up</ThemedText>
        <ThemedText size="sm" tone="muted">
          {doneCount} of {total}
        </ThemedText>
      </View>

      <View className="h-1.5 overflow-hidden rounded-full bg-background">
        <View
          className="h-full rounded-full bg-primary"
          style={{ width: `${(doneCount / total) * 100}%` }}
        />
      </View>

      <View>
        {steps.map((step) => {
          const isNext = step.key === nextStep?.key;
          return (
            <Pressable
              key={step.key}
              className="flex-row items-center gap-3 py-2"
              disabled={step.done || !step.action}
              onPress={step.action?.onPress}
            >
              <View
                className={cn(
                  "size-5 items-center justify-center rounded-full border",
                  step.done
                    ? "border-primary bg-primary"
                    : isNext
                      ? "border-primary"
                      : "border-placeholder",
                )}
              >
                {step.done ? (
                  <AppIcon color={colors.inverse} icon={Tick02Icon} size={12} />
                ) : null}
              </View>

              <View className="flex-1">
                <ThemedText
                  tone={step.done ? "muted" : "default"}
                  weight={isNext ? "semibold" : "medium"}
                >
                  {step.label}
                </ThemedText>
                {isNext ? (
                  <ThemedText className="mt-0.5" size="sm" tone="muted">
                    {step.hint}
                  </ThemedText>
                ) : null}
              </View>

              {!step.done && step.action ? (
                <AppIcon
                  color={isNext ? colors.foreground : colors.muted}
                  icon={ArrowRight01Icon}
                  size={16}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
