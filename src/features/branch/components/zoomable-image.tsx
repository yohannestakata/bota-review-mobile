import { Image } from "expo-image";
import { useEffect } from "react";
import { useWindowDimensions, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDecay,
  withSpring,
} from "react-native-reanimated";

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;
// Settles are the result of a gesture, so springs (velocity carries through).
const SETTLE = { duration: 300, dampingRatio: 1 };

/**
 * A zoomable photo, shared by the place gallery and the review photo viewer:
 * pinch zooms around your fingers (and pans with them), double-tap zooms into
 * the tapped spot or back out, one finger pans while zoomed and glides to a
 * stop, and the photo never drifts past its own edges. Pinching below 1x
 * springs back.
 */
export function ZoomableImage({
  uri,
  isZoomed,
  onZoomChange,
  onTap,
}: {
  uri: string;
  isZoomed: boolean;
  onZoomChange: (zoomed: boolean) => void;
  /** A single tap (fires only once a double-tap is ruled out). */
  onTap?: () => void;
}) {
  const { width: screenW, height: screenH } = useWindowDimensions();

  // Container size and the photo's natural size, for pan bounds.
  const box = useSharedValue({ w: screenW, h: screenH });
  const natural = useSharedValue({ w: 0, h: 0 });

  const scale = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  // Snapshot at gesture start.
  const start = useSharedValue({ s: 1, x: 0, y: 0, fx: 0, fy: 0 });

  // Paging away (or the gallery otherwise un-zooming) resets this photo.
  useEffect(() => {
    if (!isZoomed && scale.get() !== 1) {
      scale.set(withSpring(1, SETTLE));
      tx.set(withSpring(0, SETTLE));
      ty.set(withSpring(0, SETTLE));
    }
  }, [isZoomed, scale, tx, ty]);

  function bounds(s: number) {
    "worklet";
    const b = box.get();
    const n = natural.get();
    // The photo as drawn (contain-fit); the whole box until its size is known.
    const fit = n.w && n.h ? Math.min(b.w / n.w, b.h / n.h) : 0;
    const c = fit ? { w: n.w * fit, h: n.h * fit } : b;
    return {
      x: Math.max(0, (c.w * s - b.w) / 2),
      y: Math.max(0, (c.h * s - b.h) / 2),
    };
  }

  function clamp(v: number, max: number) {
    "worklet";
    return Math.min(Math.max(v, -max), max);
  }

  // Animate to a scale/translation, kept inside the photo's edges.
  function settle(s: number, x: number, y: number) {
    "worklet";
    const next = Math.min(Math.max(s, 1), MAX_SCALE);
    const b = bounds(next);
    scale.set(withSpring(next, SETTLE));
    tx.set(withSpring(next === 1 ? 0 : clamp(x, b.x), SETTLE));
    ty.set(withSpring(next === 1 ? 0 : clamp(y, b.y), SETTLE));
    runOnJS(onZoomChange)(next > 1);
  }

  // Focal point relative to the container's center.
  function fromCenter(x: number, y: number) {
    "worklet";
    const b = box.get();
    return { x: x - b.w / 2, y: y - b.h / 2 };
  }

  const pinch = Gesture.Pinch()
    .onStart((e) => {
      const f = fromCenter(e.focalX, e.focalY);
      start.set({ s: scale.get(), x: tx.get(), y: ty.get(), fx: f.x, fy: f.y });
    })
    .onUpdate((e) => {
      const st = start.get();
      const f = fromCenter(e.focalX, e.focalY);
      // A little give past the limits while pinching; settle() snaps back.
      const s = Math.min(Math.max(st.s * e.scale, 0.8), MAX_SCALE * 1.2);
      // Keep the content point under the starting focal point under the
      // (moving) fingers: t' = f' - (f0 - t0) * s' / s0.
      scale.set(s);
      tx.set(f.x - (st.fx - st.x) * (s / st.s));
      ty.set(f.y - (st.fy - st.y) * (s / st.s));
    })
    .onEnd(() => {
      settle(scale.get(), tx.get(), ty.get());
    });

  // One-finger pan, only while zoomed (otherwise paging and swipe-to-close own
  // the drag). Released with momentum, clamped to the edges.
  const pan = Gesture.Pan()
    .enabled(isZoomed)
    .maxPointers(1)
    .onStart(() => {
      start.set({ s: scale.get(), x: tx.get(), y: ty.get(), fx: 0, fy: 0 });
    })
    .onUpdate((e) => {
      const st = start.get();
      tx.set(st.x + e.translationX);
      ty.set(st.y + e.translationY);
    })
    .onEnd((e) => {
      const b = bounds(scale.get());
      tx.set(withDecay({ velocity: e.velocityX, clamp: [-b.x, b.x] }));
      ty.set(withDecay({ velocity: e.velocityY, clamp: [-b.y, b.y] }));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd((e) => {
      if (scale.get() > 1) {
        settle(1, 0, 0);
        return;
      }
      // Zoom so the tapped point stays put: t = f * (1 - s).
      const f = fromCenter(e.x, e.y);
      settle(
        DOUBLE_TAP_SCALE,
        f.x * (1 - DOUBLE_TAP_SCALE),
        f.y * (1 - DOUBLE_TAP_SCALE),
      );
    });

  const singleTap = Gesture.Tap()
    .enabled(Boolean(onTap))
    .onEnd(() => {
      if (onTap) runOnJS(onTap)();
    });

  // Zoom gestures and taps race: two fingers or a zoomed drag wins over taps;
  // a single tap waits until a double-tap is ruled out.
  const gesture = Gesture.Race(
    Gesture.Simultaneous(pinch, pan),
    Gesture.Exclusive(doubleTap, singleTap),
  );

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        collapsable={false}
        onLayout={(e) => {
          const { width, height } = e.nativeEvent.layout;
          box.set({ w: width, h: height });
        }}
        style={{ width: screenW, height: "100%", overflow: "hidden" }}
      >
        <Animated.View style={[{ flex: 1 }, style]}>
          <Image
            contentFit="contain"
            onLoad={(e) => {
              // So panning stops at the photo's edges, not the screen's.
              natural.set({ w: e.source.width, h: e.source.height });
            }}
            source={uri}
            style={{ flex: 1 }}
          />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}
