import { View } from "react-native";

import { FilledStar } from "@/components/ui/filled-star";
import { colors } from "@/lib/theme";

type StarsProps = {
  value: number;
  size?: number;
};

// Renders a 5-star row, filling stars up to the rounded rating value.
export function Stars({ value, size = 14 }: StarsProps) {
  const filled = Math.round(value);

  return (
    <View className="flex-row items-center" style={{ gap: 2 }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <FilledStar
          color={i < filled ? colors.rating : colors.subtle}
          key={i}
          size={size}
        />
      ))}
    </View>
  );
}
