import { Cancel01Icon } from "@hugeicons/core-free-icons";
import { useState } from "react";
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { colors } from "@/lib/theme";

import { ZoomableImage } from "./zoomable-image";

const { width } = Dimensions.get("window");
const CLOSE_THRESHOLD = 120;

type Photo = { id: string; url: string };

type PhotoViewerProps = {
  photos: Photo[];
  initialIndex: number;
  visible: boolean;
  onClose: () => void;
};

export function PhotoViewer({
  photos,
  initialIndex,
  visible,
  onClose,
}: PhotoViewerProps) {
  const insets = useSafeAreaInsets();
  const [zoomed, setZoomed] = useState(false);
  const dismissY = useSharedValue(0);

  // Drag vertically (when not zoomed) to dismiss; the backdrop fades with it.
  const dismiss = Gesture.Pan()
    .enabled(!zoomed)
    .activeOffsetY([-20, 20])
    .failOffsetX([-20, 20])
    .onUpdate((event) => {
      dismissY.value = event.translationY;
    })
    .onEnd((event) => {
      if (event.translationY > CLOSE_THRESHOLD) {
        runOnJS(onClose)();
      }
      dismissY.value = withTiming(0);
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(dismissY.value),
      [0, 250],
      [1, 0.2],
      Extrapolation.CLAMP,
    ),
  }));

  const contentStyle = useAnimatedStyle(() => {
    const dragScale = interpolate(
      Math.abs(dismissY.value),
      [0, 300],
      [1, 0.85],
      Extrapolation.CLAMP,
    );
    return {
      transform: [{ translateY: dismissY.value }, { scale: dragScale }],
    };
  });

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      transparent
      visible={visible}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            backdropStyle,
            { backgroundColor: "#000" },
          ]}
        />

        <GestureDetector gesture={dismiss}>
          <Animated.View style={[{ flex: 1 }, contentStyle]}>
            <FlatList
              data={photos}
              getItemLayout={(_, index) => ({
                length: width,
                offset: width * index,
                index,
              })}
              horizontal
              initialScrollIndex={initialIndex}
              keyExtractor={(item) => item.id}
              pagingEnabled
              renderItem={({ item }) => (
                <ZoomableImage
                  isZoomed={zoomed}
                  onZoomChange={setZoomed}
                  uri={item.url}
                />
              )}
              scrollEnabled={!zoomed}
              showsHorizontalScrollIndicator={false}
            />
          </Animated.View>
        </GestureDetector>

        <Pressable
          className="absolute left-4 size-10 items-center justify-center rounded-full bg-white/20"
          hitSlop={8}
          onPress={onClose}
          style={{ top: insets.top + 8 }}
        >
          <AppIcon color={colors.inverse} icon={Cancel01Icon} size={22} />
        </Pressable>
      </GestureHandlerRootView>
    </Modal>
  );
}
