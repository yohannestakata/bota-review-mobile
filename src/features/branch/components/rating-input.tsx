import { View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";

import { FilledStar } from "@/components/ui/filled-star";
import { colors } from "@/lib/theme";

const GAP = 8;

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
};

export function RatingInput({ value, onChange, size = 40 }: RatingInputProps) {
  const step = size + GAP;

  // Map an x position within the row to a 1–5 rating.
  const ratingAt = (x: number) => Math.min(5, Math.max(1, Math.ceil(x / step)));

  // Pan handles both the tap (onBegin) and the drag (onUpdate). runOnJS so the
  // JS onChange can be called directly from the gesture callbacks.
  const pan = Gesture.Pan()
    .runOnJS(true)
    .onBegin((event) => onChange(ratingAt(event.x)))
    .onUpdate((event) => onChange(ratingAt(event.x)));

  return (
    <GestureDetector gesture={pan}>
      <View
        accessibilityRole="adjustable"
        accessibilityValue={{ min: 1, max: 5, now: value }}
        className="flex-row self-start"
        style={{ gap: GAP }}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <FilledStar
            color={star <= value ? colors.rating : colors.subtle}
            key={star}
            size={size}
          />
        ))}
      </View>
    </GestureDetector>
  );
}
