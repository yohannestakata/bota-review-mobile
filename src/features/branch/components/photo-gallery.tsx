import { Cancel01Icon, Flag02Icon } from "@hugeicons/core-free-icons";
import { Image } from "expo-image";
import { Photo } from "@/components/ui/photo";
import { useEffect, useRef, useState } from "react";
import { StatusBar, StyleSheet, useWindowDimensions, View } from "react-native";
// Gesture Handler's FlatList, so the pager cooperates with pinch/pan inside it
// instead of stealing the fingers (notably on Android).
import {
  FlatList,
  Gesture,
  GestureDetector,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";

import { ZoomableImage } from "./zoomable-image";
import { PressableScale } from "@/components/ui/pressable-scale";
import { photoCategoryLabel } from "../api";

export type GalleryPhoto = {
  id: string;
  url: string;
  thumbhash?: string | null;
  category?: string | null;
};

const THUMB = 48;
const THUMB_GAP = 6;
const STRIP_PADDING = 16;
const DISMISS_DISTANCE = 120;
const DISMISS_VELOCITY = 900;
const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);

// "interior" → "Inside"; unknown values fall back to a capitalized word.
function categoryCaption(value: string) {
  return (
    photoCategoryLabel(value) ?? value.charAt(0).toUpperCase() + value.slice(1)
  );
}

/**
 * Full-screen photo gallery shared by the place gallery route and the review
 * photo viewer. Swipe between photos, pinch/double-tap to zoom, tap to hide the
 * controls, drag down to close (the photo follows the finger and the backdrop
 * fades to reveal the screen underneath), thumbnails to jump.
 */
export function PhotoGallery({
  photos,
  initialIndex = 0,
  onClose,
  onReport,
}: {
  photos: GalleryPhoto[];
  initialIndex?: number;
  onClose: () => void;
  /** Shown as a flag button when provided. */
  onReport?: (photo: GalleryPhoto) => void;
}) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const pagerRef = useRef<FlatList<GalleryPhoto>>(null);
  const stripRef = useRef<FlatList<GalleryPhoto>>(null);

  const start = Math.min(
    Math.max(initialIndex, 0),
    Math.max(photos.length - 1, 0),
  );
  const [current, setCurrent] = useState(start);
  const [zoomed, setZoomed] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const dragY = useSharedValue(0);
  const pinching = useSharedValue(false);
  const chrome = useSharedValue(1);

  useEffect(() => {
    chrome.set(
      withTiming(chromeVisible ? 1 : 0, { duration: 200, easing: EASE_OUT }),
    );
  }, [chromeVisible, chrome]);

  // Have the photos either side downloaded before they're swiped to.
  useEffect(() => {
    const neighbors = [photos[current - 1], photos[current + 1]]
      .filter((p): p is GalleryPhoto => Boolean(p))
      .map((p) => p.url);
    if (neighbors.length) void Image.prefetch(neighbors);
  }, [current, photos]);

  // Keep the active thumbnail in view (centered once the strip overflows).
  useEffect(() => {
    const stripWidth =
      photos.length * (THUMB + THUMB_GAP) - THUMB_GAP + STRIP_PADDING * 2;
    if (stripWidth <= width) return;
    const center = STRIP_PADDING + current * (THUMB + THUMB_GAP) + THUMB / 2;
    const offset = Math.min(
      Math.max(center - width / 2, 0),
      stripWidth - width,
    );
    stripRef.current?.scrollToOffset({ offset, animated: true });
  }, [current, photos.length, width]);

  function goTo(index: number) {
    if (index === current) return;
    pagerRef.current?.scrollToOffset({
      offset: index * width,
      animated: !reduced,
    });
    setZoomed(false);
    setCurrent(index);
  }

  // Drag down (or up) to close — only when not zoomed, and only once the drag
  // is clearly vertical so horizontal paging keeps working.
  const dismiss = Gesture.Pan()
    .enabled(!zoomed)
    .activeOffsetY([-15, 15])
    .failOffsetX([-15, 15])
    // A second finger means pinch-to-zoom, never close.
    .maxPointers(1)
    .onUpdate((e) => {
      // A second finger arrived: it's a pinch, so let go of the photo.
      if (e.numberOfPointers > 1) {
        pinching.set(true);
        dragY.set(withSpring(0, { duration: 200, dampingRatio: 1 }));
        return;
      }
      if (pinching.get()) return;
      dragY.set(e.translationY);
    })
    .onEnd((e) => {
      if (pinching.get()) {
        pinching.set(false);
        dragY.set(withSpring(0, { duration: 200, dampingRatio: 1 }));
        return;
      }
      if (
        Math.abs(e.translationY) > DISMISS_DISTANCE ||
        Math.abs(e.velocityY) > DISMISS_VELOCITY
      ) {
        runOnJS(onClose)();
        return;
      }
      dragY.set(
        withSpring(0, {
          duration: 300,
          dampingRatio: 1,
          velocity: e.velocityY,
        }),
      );
    });

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      Math.abs(dragY.get()),
      [0, 300],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  }));

  const pagerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: dragY.get() },
      {
        scale: interpolate(
          Math.abs(dragY.get()),
          [0, 300],
          [1, 0.88],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  // Controls fade out while tapped away or while dragging to close.
  const chromeStyle = useAnimatedStyle(() => ({
    opacity:
      chrome.get() *
      interpolate(Math.abs(dragY.get()), [0, 60], [1, 0], Extrapolation.CLAMP),
  }));

  const photo = photos[current];
  const category = photo?.category;

  return (
    <View style={StyleSheet.absoluteFill}>
      {/* Light over the black backdrop; tucked away with the controls. */}
      <StatusBar
        animated
        barStyle="light-content"
        hidden={!chromeVisible}
        showHideTransition="fade"
      />
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: "#000" },
          backdropStyle,
        ]}
      />

      <GestureDetector gesture={dismiss}>
        <Animated.View style={[{ flex: 1 }, pagerStyle]}>
          <FlatList
            data={photos}
            getItemLayout={(_, i) => ({
              length: width,
              offset: width * i,
              index: i,
            })}
            horizontal
            initialScrollIndex={start}
            keyExtractor={(item) => item.id}
            onMomentumScrollEnd={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / width);
              if (index !== current) {
                setZoomed(false);
                setCurrent(index);
              }
            }}
            pagingEnabled
            ref={pagerRef}
            renderItem={({ item }) => (
              <ZoomableImage
                isZoomed={zoomed}
                onTap={() => setChromeVisible((v) => !v)}
                onZoomChange={setZoomed}
                uri={item.url}
              />
            )}
            scrollEnabled={!zoomed}
            showsHorizontalScrollIndicator={false}
          />
        </Animated.View>
      </GestureDetector>

      <Animated.View
        pointerEvents={chromeVisible ? "box-none" : "none"}
        style={[StyleSheet.absoluteFill, chromeStyle]}
      >
        {/* Top: close · counter · report, over a soft scrim for bright photos. */}
        <View
          pointerEvents="none"
          style={{
            experimental_backgroundImage:
              "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0))",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top + 96,
          }}
        />
        <View
          className="absolute left-0 right-0 flex-row items-center justify-between px-4"
          pointerEvents="box-none"
          style={{ top: insets.top + 8 }}
        >
          <IconButton
            accessibilityLabel="Close"
            icon={Cancel01Icon}
            onPress={onClose}
            overlay
          />
          {photos.length > 1 ? (
            <ThemedText
              className="opacity-90"
              size="sm"
              tone="inverse"
              weight="medium"
            >
              {current + 1} of {photos.length}
            </ThemedText>
          ) : null}
          {onReport && photo ? (
            <IconButton
              accessibilityLabel="Report photo"
              icon={Flag02Icon}
              iconSize={18}
              onPress={() => onReport(photo)}
              overlay
            />
          ) : (
            <View className="size-10" />
          )}
        </View>

        {/* Bottom: category caption and the thumbnail strip. */}
        {photos.length > 1 || category ? (
          <>
            <View
              pointerEvents="none"
              style={{
                experimental_backgroundImage:
                  "linear-gradient(to bottom, rgba(0,0,0,0), rgba(0,0,0,0.6))",
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: insets.bottom + 140,
              }}
            />
            <View
              className="absolute left-0 right-0 items-center gap-3"
              pointerEvents="box-none"
              style={{ bottom: insets.bottom + 12 }}
            >
              {category ? (
                <ThemedText
                  className="opacity-80"
                  size="sm"
                  tone="inverse"
                  weight="medium"
                >
                  {categoryCaption(category)}
                </ThemedText>
              ) : null}
              {photos.length > 1 ? (
                <FlatList
                  contentContainerStyle={{
                    flexGrow: 1,
                    justifyContent: "center",
                    paddingHorizontal: STRIP_PADDING,
                    gap: THUMB_GAP,
                  }}
                  data={photos}
                  horizontal
                  keyExtractor={(item) => item.id}
                  ref={stripRef}
                  renderItem={({ item, index }) => (
                    <PressableScale
                      accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
                      accessibilityRole="button"
                      accessibilityState={{ selected: index === current }}
                      hitSlop={{ top: 8, bottom: 8 }}
                      onPress={() => goTo(index)}
                    >
                      <Photo
                        displayWidth={THUMB}
                        style={{
                          width: THUMB,
                          height: THUMB,
                          borderRadius: 8,
                          opacity: index === current ? 1 : 0.45,
                        }}
                        thumbhash={item.thumbhash}
                        transition={150}
                        uri={item.url}
                      />
                    </PressableScale>
                  )}
                  showsHorizontalScrollIndicator={false}
                  style={{ width, flexGrow: 0 }}
                />
              ) : null}
            </View>
          </>
        ) : null}
      </Animated.View>
    </View>
  );
}
