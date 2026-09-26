import {
  ArrowRight01Icon,
  ImageAdd01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { useEffect, type ReactNode } from "react";
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
import { useColors } from "@/lib/theme";

// Rare-tier moment (once per posted review), purpose: delight. All five stars
// sit grey from the first frame; the ones the user gave are stamped in green one
// after another — each pops past full size with a small twist, then settles —
// with a haptic tick on each landing and a success buzz on the last. Timing, no
// springs (nothing was thrown); done in well under a second.
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
const EASE_IN_OUT = Easing.bezier(0.77, 0, 0.175, 1);
const ENTER_MS = 250;
const FILL_MS = 420;
const FILL_START_MS = 150;
const FILL_STAGGER_MS = 110;
// The stamp lands (reaches full size) at this point of the fill.
const LAND_AT = 0.55;

// Built once at module scope — an inline builder chain in JSX rebuilds on
// every render. The fill grows over a grey star already in place, so it reads
// as filling, not appearing from nothing.
const STAR_FILL = [0, 1, 2, 3, 4].map((index) =>
  new Keyframe({
    0: { opacity: 0, transform: [{ scale: 0.4 }, { rotate: "-24deg" }] },
    [LAND_AT * 100]: {
      opacity: 1,
      transform: [{ scale: 1.18 }, { rotate: "6deg" }],
      easing: EASE_OUT,
    },
    100: {
      opacity: 1,
      transform: [{ scale: 1 }, { rotate: "0deg" }],
      easing: EASE_IN_OUT,
    },
  })
    .duration(FILL_MS)
    .delay(FILL_START_MS + index * FILL_STAGGER_MS),
);
const HEADLINE_ENTERING = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 8 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }], easing: EASE_OUT },
})
  .duration(ENTER_MS)
  .delay(200);
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
  /** `art` is the badge's medallion, rendered by the caller (profile owns it). */
  newBadge?: { title: string; description: string; art: ReactNode };
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
  const colors = useColors();
  const reduced = useReducedMotion();

  // Same frame as the visual: a tick as each star lands, and the success buzz
  // on the last one. Reduced motion has no stamps, so just the buzz.
  useEffect(() => {
    if (reduced || rating < 1) {
      haptics.success();
      return;
    }
    const timers = Array.from({ length: rating }, (_, index) =>
      setTimeout(
        index === rating - 1 ? haptics.success : haptics.select,
        FILL_START_MS + index * FILL_STAGGER_MS + FILL_MS * LAND_AT,
      ),
    );
    return () => timers.forEach(clearTimeout);
    // Once per celebration — not again if Reduce Motion flips mid-way.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
              <View key={star}>
                <FilledStar color={colors.subtle} size={44} />
                {star <= rating ? (
                  <Animated.View
                    className="absolute inset-0"
                    entering={reduced ? REDUCED_ENTERING : STAR_FILL[star - 1]}
                  >
                    <FilledStar color={colors.rating} size={44} />
                  </Animated.View>
                ) : null}
              </View>
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
              className="flex-row items-center gap-4 rounded-2xl bg-personalized p-4"
              entering={reduced ? REDUCED_ENTERING : BADGE_ENTERING}
            >
              {newBadge.art}
              <View className="flex-1">
                <ThemedText size="xs" tone="brand" weight="semibold">
                  New badge unlocked
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
  const colors = useColors();
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
