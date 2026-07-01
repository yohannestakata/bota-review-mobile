import { colors } from "@/lib/theme";
import { Pressable, View } from "react-native";

import { FilledStar } from "@/components/ui/filled-star";

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
          <FilledStar
            color={star <= value ? colors.rating : colors.subtle}
            size={size}
          />
        </Pressable>
      ))}
    </View>
  );
}
