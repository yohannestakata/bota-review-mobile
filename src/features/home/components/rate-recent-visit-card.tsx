import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { TapToRate } from "@/features/branch";
// Direct file import: the profile barrel imports features/home, which would
// make a require cycle with this component.
import { useMyReviews } from "@/features/profile/queries";
import { analytics } from "@/lib/analytics";
import { useColors } from "@/lib/theme";
import { useDeviceList } from "@/lib/use-device-list";
import { useRecentlyViewed } from "@/lib/use-recently-viewed";

// Looked it up a few hours ago → they probably went. Two weeks on, the visit is
// too fuzzy to rate well.
const MIN_AGE_MS = 3 * 60 * 60 * 1000;
const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

const idOf = (id: string) => id;

// "Been to X lately?" — meets the user where they are by asking about a place
// they recently viewed and haven't reviewed. One tap on a star opens the review
// with that rating prefilled; dismissing hides that place for good.
export function RateRecentVisitCard() {
  const colors = useColors();
  const recentlyViewed = useRecentlyViewed();
  const dismissed = useDeviceList<string>("rate-nudge-dismissed", {
    max: 30,
    idOf,
  });
  const myReviews = useMyReviews();
  // Refreshed whenever Home regains focus (Home stays mounted under other
  // screens), so a place viewed a moment ago is judged against the real time.
  const [now, setNow] = useState(() => Date.now());
  useFocusEffect(
    useCallback(() => {
      setNow(Date.now());
    }, []),
  );

  // Wait for every source so the card never flashes for a place that turns out
  // to be reviewed or dismissed.
  if (!recentlyViewed.ready || !dismissed.ready || !myReviews.isSuccess) {
    return null;
  }

  const reviewed = new Set(
    myReviews.data
      .filter((review) => review.moderationStatus !== "archived")
      .map((review) => review.branchId),
  );
  const dismissedIds = new Set(dismissed.items);
  const place = recentlyViewed.items.find((item) => {
    const age = now - item.viewedAt;
    return (
      age >= MIN_AGE_MS &&
      age <= MAX_AGE_MS &&
      !reviewed.has(item.id) &&
      !dismissedIds.has(item.id)
    );
  });
  if (!place) return null;

  return (
    <View className="mt-6 bg-personalized px-6 py-5">
      <View className="flex-row items-start gap-3">
        <View className="flex-1">
          <ThemedText size="lg" weight="semibold">
            Been to {place.name} lately?
          </ThemedText>
          <ThemedText className="mt-0.5" size="sm" tone="muted">
            Tap a star to rate your visit.
          </ThemedText>
        </View>
        <Pressable
          accessibilityLabel={`Don't ask about ${place.name} again`}
          accessibilityRole="button"
          hitSlop={10}
          onPress={() => {
            analytics.track("rate_nudge_dismissed", { branch_id: place.id });
            dismissed.add(place.id);
          }}
        >
          <AppIcon color={colors.muted} icon={Cancel01Icon} size={18} />
        </Pressable>
      </View>
      <View className="mt-3">
        <TapToRate
          onRate={(rating) => {
            analytics.track("rate_nudge_tapped", {
              branch_id: place.id,
              rating,
            });
            router.push(`/review/${place.id}?rating=${rating}`);
          }}
          size={30}
        />
      </View>
    </View>
  );
}
