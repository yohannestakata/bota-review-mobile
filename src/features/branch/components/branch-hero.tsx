import { Pressable, useWindowDimensions } from "react-native";

import { useColors } from "@/lib/theme";
import { Photo, PhotoFallback } from "@/components/ui/photo";

import { HERO_HEIGHT, heroCovered } from "../hero-shared";
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from "react-native-reanimated";

export { HERO_HEIGHT };

type BranchHeroProps = {
  imageUrl: string | null;
  imageThumbhash?: string | null;
  scrollY: SharedValue<number>;
  onPress?: () => void;
};

export function BranchHero({
  imageUrl,
  imageThumbhash,
  scrollY,
  onPress,
}: BranchHeroProps) {
  const { width } = useWindowDimensions();
  // Hidden while a card's photo is flying in to cover it (see shared-photo).
  const photoStyle = useAnimatedStyle(() => ({
    opacity: 1 - heroCovered.get(),
  }));

  const colors = useColors();
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
        {
          height: HERO_HEIGHT,
          width: "100%",
          backgroundColor: colors.placeholder,
        },
        animatedStyle,
      ]}
    >
      <Pressable
        accessibilityLabel="Open photo gallery"
        accessibilityRole="imagebutton"
        disabled={!onPress}
        onPress={onPress}
        style={{ flex: 1 }}
      >
        {imageUrl ? (
          <Animated.View style={[{ flex: 1 }, photoStyle]}>
            <Photo
              displayWidth={width}
              thumbhash={imageThumbhash}
              style={{ width: "100%", height: "100%" }}
              uri={imageUrl}
            />
          </Animated.View>
        ) : (
          <PhotoFallback iconSize={64} />
        )}
      </Pressable>
    </Animated.View>
  );
}
