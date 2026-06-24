import { Image } from "expo-image";
import { Dimensions } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

// A single pinch/double-tap zoomable, pannable-while-zoomed image. Shared by the
// modal PhotoViewer and the full-screen gallery route so the gesture logic lives
// in one place.
export function ZoomableImage({
  uri,
  isZoomed,
  onZoomChange,
}: {
  uri: string;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
}) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const savedTx = useSharedValue(0);
  const savedTy = useSharedValue(0);

  function reset() {
    "worklet";
    scale.value = withTiming(1);
    savedScale.value = 1;
    tx.value = withTiming(0);
    ty.value = withTiming(0);
    savedTx.value = 0;
    savedTy.value = 0;
    runOnJS(onZoomChange)(false);
  }

  const pinch = Gesture.Pinch()
    .onUpdate((event) => {
      scale.value = Math.max(0.5, savedScale.value * event.scale);
    })
    .onEnd(() => {
      if (scale.value <= 1) {
        reset();
      } else {
        savedScale.value = scale.value;
        runOnJS(onZoomChange)(true);
      }
    });

  // Pan only while zoomed (otherwise paging + swipe-to-close own the drag).
  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .onUpdate((event) => {
      tx.value = savedTx.value + event.translationX;
      ty.value = savedTy.value + event.translationY;
    })
    .onEnd(() => {
      savedTx.value = tx.value;
      savedTy.value = ty.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.value > 1) {
        reset();
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
        runOnJS(onZoomChange)(true);
      }
    });

  const gesture = Gesture.Exclusive(
    doubleTap,
    Gesture.Simultaneous(pinch, pan),
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View
        style={[{ width, height: "100%", justifyContent: "center" }, style]}
      >
        <Image
          contentFit="contain"
          source={uri}
          style={{ width, height: "100%" }}
        />
      </Animated.View>
    </GestureDetector>
  );
}
