import { StarIcon } from "@hugeicons/core-free-icons";
import { View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
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
        <AppIcon
          color={i < filled ? colors.rating : colors.subtle}
          icon={StarIcon}
          key={i}
          size={size}
          strokeWidth={2}
        />
      ))}
    </View>
  );
}
