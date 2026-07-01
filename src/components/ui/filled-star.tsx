import { Text } from "react-native";

import { colors } from "@/lib/theme";

type FilledStarProps = {
  color?: string;
  size?: number;
};

export function FilledStar({
  color = colors.rating,
  size = 14,
}: FilledStarProps) {
  return (
    <Text
      allowFontScaling={false}
      style={{
        color,
        fontFamily: "Outfit-Bold",
        fontSize: size,
        lineHeight: size,
      }}
    >
      ★
    </Text>
  );
}
