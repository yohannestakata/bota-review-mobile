import { Pressable, View } from "react-native";

import { FilledStar } from "@/components/ui/filled-star";
import { haptics } from "@/lib/haptics";
import { useColors } from "@/lib/theme";

// A row of five tappable stars that starts a review with that rating prefilled.
// Plain Pressables rather than RatingInput: its pan gesture fires on the first
// touch of a scroll, so inside a scrolling screen it would navigate by accident.
export function TapToRate({
  onRate,
  size = 32,
}: {
  onRate: (rating: number) => void;
  size?: number;
}) {
  const colors = useColors();
  return (
    <View className="flex-row gap-2">
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable
          accessibilityLabel={`Rate ${star} star${star === 1 ? "" : "s"}`}
          accessibilityRole="button"
          hitSlop={4}
          key={star}
          onPress={() => {
            haptics.select();
            onRate(star);
          }}
        >
          <FilledStar color={colors.subtle} size={size} />
        </Pressable>
      ))}
    </View>
  );
}
