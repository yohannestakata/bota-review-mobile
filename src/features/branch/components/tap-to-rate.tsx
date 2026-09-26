import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { FilledStar } from "@/components/ui/filled-star";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";

const GAP = 8;

// A row of five stars that starts a review with that rating prefilled. Tap a
// star, or slide across them — they fill as you go, ticking per star — and
// lifting opens the review. These strips live inside scrolling screens, so the
// slide only claims clearly horizontal drags (a vertical move lets the page
// scroll) and nothing fires on first touch.
export function TapToRate({
  onRate,
  size = 32,
}: {
  onRate: (rating: number) => void;
  size?: number;
}) {
  const colors = useColors();
  const [preview, setPreview] = useState(0);
  const step = size + GAP;
  const ratingAt = (x: number) => Math.min(5, Math.max(1, Math.ceil(x / step)));

  // The filled preview stays while the review screen opens; clear it once
  // this screen is back in view.
  useFocusEffect(useCallback(() => setPreview(0), []));

  function slideTo(x: number) {
    const next = ratingAt(x);
    if (next === preview) return;
    haptics.select();
    setPreview(next);
  }

  function commit(rating: number) {
    setPreview(rating);
    onRate(rating);
  }

  const slide = Gesture.Pan()
    .runOnJS(true)
    .activeOffsetX([-8, 8])
    .failOffsetY([-10, 10])
    .onStart((e) => slideTo(e.x))
    .onUpdate((e) => slideTo(e.x))
    .onEnd((e) => commit(ratingAt(e.x)));

  const tap = Gesture.Tap()
    .runOnJS(true)
    .onEnd((e) => {
      haptics.select();
      commit(ratingAt(e.x));
    });

  return (
    <GestureDetector gesture={Gesture.Race(slide, tap)}>
      <View
        accessibilityActions={[1, 2, 3, 4, 5].map((n) => ({
          name: `rate${n}`,
          label: `Rate ${n} star${n === 1 ? "" : "s"}`,
        }))}
        accessibilityLabel="Rate this place"
        accessibilityRole="adjustable"
        onAccessibilityAction={(e) => {
          const n = Number(e.nativeEvent.actionName.replace("rate", ""));
          if (n >= 1 && n <= 5) commit(n);
        }}
        className="flex-row self-start"
        // Vertical padding widens the touch area without moving the stars.
        style={{ gap: GAP, paddingVertical: 6, marginVertical: -6 }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <FilledStar
            color={star <= preview ? colors.rating : colors.subtle}
            key={star}
            size={size}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
