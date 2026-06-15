import { Image } from "expo-image";
import { Pressable } from "react-native";

import { colors } from "@/lib/theme";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

export const HERO_HEIGHT = 360;

type BranchHeroProps = {
  imageUrl: string | null;
  scrollY: SharedValue<number>;
  onPress?: () => void;
};

export function BranchHero({ imageUrl, scrollY, onPress }: BranchHeroProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const y = scrollY.value;
    return {
      transform: [
        // Parallax: image drifts down at ~half the scroll speed as you scroll up,
        // and follows your finger when you pull down past the top.
        {
          translateY: interpolate(
            y,
            [-HERO_HEIGHT, 0, HERO_HEIGHT],
            [-HERO_HEIGHT / 2, 0, HERO_HEIGHT * 0.5],
          ),
        },
        // Zoom in when overscrolling downward for a stretch effect.
        {
          scale: interpolate(y, [-HERO_HEIGHT, 0], [2, 1], Extrapolation.CLAMP),
        },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        { height: HERO_HEIGHT, width: "100%", backgroundColor: colors.placeholder },
        animatedStyle,
      ]}
    >
      <Pressable disabled={!onPress} onPress={onPress} style={{ flex: 1 }}>
        {imageUrl ? (
          <Image
            contentFit="cover"
            source={imageUrl}
            style={{ width: "100%", height: "100%" }}
            transition={150}
          />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}
