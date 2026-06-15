import { StarIcon } from "@hugeicons/core-free-icons";
import { colors } from "@/lib/theme";
import { Pressable, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";

type RatingInputProps = {
  value: number;
  onChange: (value: number) => void;
  size?: number;
};

export function RatingInput({ value, onChange, size = 40 }: RatingInputProps) {
  return (
    <View className="flex-row" style={{ gap: 8 }}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Pressable hitSlop={6} key={star} onPress={() => onChange(star)}>
          <AppIcon
            color={star <= value ? colors.rating : colors.subtle}
            icon={StarIcon}
            size={size}
            strokeWidth={2}
          />
        </Pressable>
      ))}
    </View>
  );
}
