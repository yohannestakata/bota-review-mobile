import { Pressable } from "react-native";

import { useColors } from "@/lib/theme";
import { Photo, PhotoFallback } from "@/components/ui/photo";
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
  /** Hide the photo while a card's photo is still flying in to cover it. */
  photoHidden?: boolean;
};

export function BranchHero({
  imageUrl,
  scrollY,
  onPress,
  photoHidden = false,
}: BranchHeroProps) {
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
          <Photo
            style={{
              width: "100%",
              height: "100%",
              opacity: photoHidden ? 0 : 1,
            }}
            uri={imageUrl}
          />
        ) : (
          <PhotoFallback iconSize={64} />
        )}
      </Pressable>
    </Animated.View>
  );
}
