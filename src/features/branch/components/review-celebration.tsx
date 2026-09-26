import {
  ArrowRight01Icon,
  ImageAdd01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useEffect, type ComponentProps } from "react";
import { Pressable, ScrollView, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Button } from "@/components/ui/button";
import { FilledStar } from "@/components/ui/filled-star";
import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import type { BranchCard } from "@/lib/api";
import { haptics } from "@/lib/haptics";
import { colors } from "@/lib/theme";

type IconType = ComponentProps<typeof AppIcon>["icon"];

// Rare-tier moment (once per posted review), purpose: confirmation. Kept
// restrained: no springs (nothing was thrown), nothing scales from zero, every
// piece is in within ~450ms so "Done" is never waiting on the animation.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const ENTER_MS = 250;
const STAR_STAGGER_MS = 40;

// Built once at module scope — an inline builder chain in JSX rebuilds on
// every render.
const STAR_ENTERING = [0, 1, 2, 3, 4].map((index) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.9 }] },
    100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
  })
    .duration(ENTER_MS)
    .delay(index * STAR_STAGGER_MS),
);
const HEADLINE_ENTERING = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
})
  .duration(ENTER_MS)
  .delay(120);
const BADGE_ENTERING = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.97 }] },
  100: { opacity: 1, transform: [{ scale: 1 }], easing: EASE_OUT },
})
  .duration(ENTER_MS)
  .delay(200);
const CONTENT_ENTERING = new Keyframe({
  0: { opacity: 0 },
  100: { opacity: 1, easing: EASE_OUT },
})
  .duration(ENTER_MS)
  .delay(200);
// Reduced motion: fewer and gentler — keep the fade, drop scale and movement.
const REDUCED_ENTERING = FadeIn.duration(200);

// The payoff after posting a review: stars fill in one by one, then the user is
// offered a natural next step (another place they've saved) instead of being
// dropped back where they started.
export function ReviewCelebration({
  rating,
  newBadge,
  placeName,
  reviewNumber,
  pendingModeration,
  failedPhotoCount,
  retryingPhotos,
  onRetryPhotos,
  suggestions,
  onPickSuggestion,
  onFindAnother,
  onDone,
}: {
  rating: number;
  /** A badge this review just unlocked — the unexpected reward. */
  newBadge?: { title: string; description: string; icon: IconType };
  placeName?: string;
  reviewNumber?: number;
  pendingModeration: boolean;
  failedPhotoCount: number;
  retryingPhotos: boolean;
  onRetryPhotos: () => void;
  suggestions: BranchCard[];
  onPickSuggestion: (branch: BranchCard) => void;
  onFindAnother: () => void;
  onDone: () => void;
}) {
  const reduced = useReducedMotion();

  // Same frame as the visual: the success tap lands as the stars appear.
  useEffect(() => {
    haptics.success();
  }, []);

  const headline = reviewNumber
    ? `Review #${reviewNumber} is ${pendingModeration ? "in" : "live"}!`
    : `Your review is ${pendingModeration ? "in" : "live"}!`;
  const where = placeName ?? "this spot";
  const body = pendingModeration
    ? `Thanks! It'll show on ${where} after a quick check.`
    : `Thanks for helping people decide on ${where}.`;

  return (
    <SafeAreaView className="flex-1 bg-background">
      <ScrollView
        contentContainerClassName="flex-grow justify-center px-6 py-8"
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center">
          <View className="flex-row gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Animated.View
                entering={reduced ? REDUCED_ENTERING : STAR_ENTERING[star - 1]}
                key={star}
              >
                <FilledStar
                  color={star <= rating ? colors.rating : colors.subtle}
                  size={44}
                />
              </Animated.View>
            ))}
          </View>

          <Animated.View
            className="mt-8 items-center"
            entering={reduced ? REDUCED_ENTERING : HEADLINE_ENTERING}
          >
            <ThemedText className="text-center" size="3xl" weight="bold">
              {headline}
            </ThemedText>
            <ThemedText className="mt-2 text-center" tone="muted">
              {body}
            </ThemedText>
          </Animated.View>
        </View>

        <Animated.View
          className="mt-8 gap-6"
          entering={reduced ? REDUCED_ENTERING : CONTENT_ENTERING}
        >
          {newBadge ? (
            <Animated.View
              className="flex-row items-center gap-4 rounded-2xl bg-accent-soft p-4"
              entering={reduced ? REDUCED_ENTERING : BADGE_ENTERING}
            >
              <View className="size-12 items-center justify-center rounded-full bg-surface">
                <AppIcon color={colors.accent} icon={newBadge.icon} size={24} />
              </View>
              <View className="flex-1">
                <ThemedText size="xs" tone="muted" weight="semibold">
                  NEW BADGE UNLOCKED
                </ThemedText>
                <ThemedText size="lg" weight="bold">
                  {newBadge.title}
                </ThemedText>
                <ThemedText size="sm" tone="muted">
                  {newBadge.description}
                </ThemedText>
              </View>
            </Animated.View>
          ) : null}

          {failedPhotoCount > 0 ? (
            <View className="flex-row items-center gap-3 rounded-2xl bg-warning-soft p-4">
              <AppIcon
                color={colors.foreground}
                icon={ImageAdd01Icon}
                size={22}
              />
              <ThemedText className="flex-1" size="sm">
                {failedPhotoCount === 1
                  ? "1 photo didn't upload."
                  : `${failedPhotoCount} photos didn't upload.`}{" "}
                Check your connection and try again.
              </ThemedText>
              <Button
                label="Retry"
                loading={retryingPhotos}
                onPress={onRetryPhotos}
                size="xs"
                variant="secondary"
              />
            </View>
          ) : null}

          {suggestions.length > 0 ? (
            <View className="gap-3">
              <ThemedText size="lg" weight="semibold">
                Been to one of these lately?
              </ThemedText>
              {suggestions.map((branch) => (
                <SuggestionRow
                  branch={branch}
                  key={branch.id}
                  onPress={() => onPickSuggestion(branch)}
                />
              ))}
            </View>
          ) : null}
        </Animated.View>
      </ScrollView>

      <Animated.View
        className="gap-1 px-6 pb-2 pt-2"
        entering={reduced ? REDUCED_ENTERING : CONTENT_ENTERING}
      >
        <Button label="Done" onPress={onDone} />
        {suggestions.length === 0 ? (
          <Button
            label="Review another place"
            onPress={onFindAnother}
            size="sm"
            variant="ghost"
          />
        ) : null}
      </Animated.View>
    </SafeAreaView>
  );
}

function SuggestionRow({
  branch,
  onPress,
}: {
  branch: BranchCard;
  onPress: () => void;
}) {
  // Branch labels often repeat the neighborhood ("Bole · Bole") — show it once.
  const subtitle = [...new Set([branch.neighborhood?.name, branch.label])]
    .filter(Boolean)
    .join(" · ");

  return (
    <Pressable
      accessibilityLabel={`Review ${branch.placeName}`}
      accessibilityRole="button"
      className="flex-row items-center gap-3 rounded-2xl bg-surface-muted p-3"
      onPress={onPress}
    >
      <View className="size-14 overflow-hidden rounded-xl bg-placeholder">
        {branch.coverPhotoUrl ? (
          <Image
            contentFit="cover"
            source={branch.coverPhotoUrl}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <View className="flex-1 items-center justify-center">
            <AppIcon color={colors.muted} icon={StarIcon} size={20} />
          </View>
        )}
      </View>
      <View className="flex-1">
        <ThemedText numberOfLines={1} weight="semibold">
          {branch.placeName}
        </ThemedText>
        {subtitle ? (
          <ThemedText numberOfLines={1} size="sm" tone="muted">
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText size="sm" tone="brand" weight="semibold">
        Rate it
      </ThemedText>
      <AppIcon color={colors.primary} icon={ArrowRight01Icon} size={18} />
    </Pressable>
  );
}
