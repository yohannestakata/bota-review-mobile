import {
  ArrowLeft01Icon,
  Camera01Icon,
  CameraRotated01Icon,
  FlashIcon,
  FlashOffIcon,
  Image02Icon,
} from "@hugeicons/core-free-icons";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Image } from "expo-image";
import { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Linking,
  Modal,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutRectangle,
} from "react-native";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { Button, TextButton } from "@/components/ui/button";
import { AppIcon } from "@/components/ui/huge-icon";
import { PressableScale } from "@/components/ui/pressable-scale";
import { ThemedText } from "@/components/ui/themed-text";
import { haptics } from "@/lib/haptics";
import {
  pickFromLibrary,
  registerPhotoSource,
  type PickedImage,
  type PickImageOptions,
  type PickImageResult,
} from "@/lib/use-pick-image";
import { useColors } from "@/lib/theme";

type Request = {
  options: PickImageOptions;
  resolve: (result: PickImageResult) => void;
};
type Phase = "sheet" | "camera" | "review";

const TILE_HEIGHT = 148;
const TILE_RADIUS = 16;
// Sheet: occasional tier, ease-out in, faster out.
const SHEET_IN = { duration: 280, easing: Easing.bezier(0.23, 1, 0.32, 1) };
const SHEET_OUT = { duration: 200, easing: Easing.bezier(0.23, 1, 0.32, 1) };
// The tile growing into the camera is one element moving on screen, so an
// in-out curve with a soft landing (iOS-sheet-like), a touch slower than a sheet.
const EXPAND = { duration: 420, easing: Easing.bezier(0.32, 0.72, 0, 1) };
const COLLAPSE = { duration: 320, easing: Easing.bezier(0.32, 0.72, 0, 1) };

/**
 * "Add a photo" chooser used by every photo picker (via usePickImage): a sheet
 * with a live camera tile and a library tile. Tapping the camera tile grows it
 * into a full-screen in-app camera (shutter, flip, flash), then Retake / Use
 * photo. Mounted once at the root.
 */
export function PhotoSourceHost() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  // The overlay is drawn under the system bars (translucent modal), so the
  // camera must fill the whole screen. On Android the window height leaves
  // out the navigation bar, and the live preview would show through there.
  const window = useWindowDimensions();
  const screenW = window.width;
  const screenH = Math.max(window.height, Dimensions.get("screen").height);
  const [permission, requestPermission] = useCameraPermissions();

  const [request, setRequest] = useState<Request | null>(null);
  const [phase, setPhase] = useState<Phase>("sheet");
  const [photo, setPhoto] = useState<PickedImage | null>(null);
  const [facing, setFacing] = useState<"back" | "front">("back");
  const [flash, setFlash] = useState<"off" | "on">("off");
  const [capturing, setCapturing] = useState(false);
  const [sheetLayout, setSheetLayout] = useState<LayoutRectangle | null>(null);
  const [rowLayout, setRowLayout] = useState<LayoutRectangle | null>(null);
  const [tileLayout, setTileLayout] = useState<LayoutRectangle | null>(null);
  const cameraRef = useRef<CameraView>(null);

  const sheet = useSharedValue(0); // 0 hidden → 1 shown
  const expand = useSharedValue(0); // 0 tile → 1 full screen
  const fade = useSharedValue(1); // whole overlay, for the final hand-off
  const tile = useSharedValue({ x: 0, y: 0, w: 0, h: 0, sheetH: 0 });

  useEffect(() => {
    registerPhotoSource(
      (options) =>
        new Promise<PickImageResult>((resolve) => {
          setPhase("sheet");
          setPhoto(null);
          setRequest({ options, resolve });
        }),
    );
    return () => registerPhotoSource(null);
  }, []);

  useEffect(() => {
    if (request) {
      fade.set(1);
      expand.set(0);
      sheet.set(withTiming(1, reduced ? { duration: 0 } : SHEET_IN));
    }
  }, [request, reduced, sheet, expand, fade]);

  // The camera tile's frame in overlay coordinates, for the grow animation.
  useEffect(() => {
    if (!sheetLayout || !rowLayout || !tileLayout) return;
    tile.set({
      x: rowLayout.x + tileLayout.x,
      y: sheetLayout.y + rowLayout.y + tileLayout.y,
      w: tileLayout.width,
      h: tileLayout.height,
      sheetH: sheetLayout.height,
    });
  }, [sheetLayout, rowLayout, tileLayout, tile]);

  function finish(result: PickImageResult) {
    request?.resolve(result);
    setRequest(null);
    setSheetLayout(null);
    setRowLayout(null);
    setTileLayout(null);
  }

  function dismiss(result: PickImageResult = { status: "canceled" }) {
    sheet.set(
      withTiming(0, reduced ? { duration: 0 } : SHEET_OUT, (done) => {
        if (done) runOnJS(finish)(result);
      }),
    );
  }

  async function chooseLibrary() {
    if (!request) return;
    // Presented over this overlay; the sheet leaves once the picker returns.
    const result = await pickFromLibrary(request.options);
    dismiss(result);
  }

  async function openCamera() {
    let granted = permission?.granted ?? false;
    if (!granted) {
      if (permission && !permission.canAskAgain) {
        Alert.alert(
          "Camera access is off",
          "Turn on camera access for Bota in Settings to take photos here.",
          [
            { text: "Not now", style: "cancel" },
            {
              text: "Open Settings",
              onPress: () => void Linking.openSettings(),
            },
          ],
        );
        return;
      }
      granted = (await requestPermission()).granted;
      if (!granted) return;
    }
    haptics.tap();
    setPhase("camera");
    expand.set(withTiming(1, reduced ? { duration: 0 } : EXPAND));
  }

  function retake() {
    setPhoto(null);
    setPhase("camera");
  }

  // Back steps out one level: review → camera → sheet.
  function goBack() {
    if (phase === "review") retake();
    else closeCamera();
  }

  function closeCamera() {
    setPhoto(null);
    setPhase("sheet");
    expand.set(withTiming(0, reduced ? { duration: 0 } : COLLAPSE));
  }

  async function takePhoto() {
    if (!cameraRef.current || capturing) return;
    haptics.tap();
    setCapturing(true);
    try {
      const shot = await cameraRef.current.takePictureAsync({
        quality: request?.options.quality ?? 0.8,
        base64: request?.options.base64 ?? false,
      });
      setPhoto({
        uri: shot.uri,
        width: shot.width,
        height: shot.height,
        base64: shot.base64 ?? null,
        fileName: `photo-${Date.now()}.jpg`,
        mimeType: "image/jpeg",
      });
      setPhase("review");
    } catch {
      // A failed capture just leaves the camera up to try again.
    } finally {
      setCapturing(false);
    }
  }

  function acceptPhoto() {
    if (!photo) return;
    const picked = photo;
    fade.set(
      withTiming(0, { duration: 200 }, (done) => {
        if (done) runOnJS(finish)({ status: "picked", images: [picked] });
      }),
    );
  }

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: sheet.get() * 0.45,
  }));

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: (1 - sheet.get()) * (tile.get().sheetH || screenH) },
    ],
  }));

  // One container that sits exactly on the tile and grows to full screen.
  const cameraStyle = useAnimatedStyle(() => {
    const t = tile.get();
    const p = expand.get();
    const tileTop = t.y + (1 - sheet.get()) * t.sheetH;
    return {
      opacity: t.w === 0 ? 0 : 1,
      left: interpolate(p, [0, 1], [t.x, 0]),
      top: interpolate(p, [0, 1], [tileTop, 0]),
      width: interpolate(p, [0, 1], [t.w, screenW]),
      height: interpolate(p, [0, 1], [t.h, screenH]),
      borderRadius: interpolate(p, [0, 1], [TILE_RADIUS, 0]),
    };
  });

  const tileLabelStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.get(), [0, 0.3], [1, 0], "clamp"),
  }));
  const controlsStyle = useAnimatedStyle(() => ({
    opacity: interpolate(expand.get(), [0.6, 1], [0, 1], "clamp"),
  }));
  const rootStyle = useAnimatedStyle(() => ({ opacity: fade.get() }));

  const cameraLive = Boolean(permission?.granted);
  const inCamera = phase !== "sheet";

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={() => (inCamera ? goBack() : dismiss())}
      statusBarTranslucent
      transparent
      visible={request !== null}
    >
      {inCamera ? <StatusBar animated barStyle="light-content" /> : null}
      <Animated.View style={[{ flex: 1 }, rootStyle]}>
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: "#000" },
            backdropStyle,
          ]}
        >
          <Pressable
            accessibilityLabel="Close"
            onPress={() => dismiss()}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>

        <Animated.View
          className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-surface px-6 pt-3"
          onLayout={(e) => setSheetLayout(e.nativeEvent.layout)}
          style={[{ paddingBottom: insets.bottom + 20 }, sheetStyle]}
        >
          <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
          <ThemedText size="lg" weight="semibold">
            Add a photo
          </ThemedText>
          <View
            className="mt-4 flex-row gap-3"
            onLayout={(e) => setRowLayout(e.nativeEvent.layout)}
          >
            {/* Placeholder: the live camera container is drawn over it. */}
            <View
              onLayout={(e) => setTileLayout(e.nativeEvent.layout)}
              style={{ flex: 1, height: TILE_HEIGHT }}
            />
            <PressableScale
              accessibilityLabel="Choose from your photos"
              accessibilityRole="button"
              className="flex-1 items-center justify-center gap-2 rounded-2xl bg-surface-muted"
              onPress={() => void chooseLibrary()}
              style={{ height: TILE_HEIGHT }}
            >
              <AppIcon color={colors.foreground} icon={Image02Icon} size={26} />
              <ThemedText size="sm" weight="medium">
                Photos
              </ThemedText>
            </PressableScale>
          </View>
        </Animated.View>

        <Animated.View
          style={[
            {
              position: "absolute",
              overflow: "hidden",
              backgroundColor: cameraLive ? "#000" : colors.surfaceMuted,
            },
            cameraStyle,
          ]}
        >
          {/* Removed (not just paused) under the taken photo: on some Android
              phones a paused preview still draws over the status bar. */}
          {cameraLive && phase !== "review" ? (
            <CameraView
              enableTorch={false}
              facing={facing}
              flash={flash}
              ref={cameraRef}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {photo ? (
            <Image
              contentFit="cover"
              source={photo.uri}
              style={StyleSheet.absoluteFill}
            />
          ) : null}

          {/* Tile face: tapping it grows the tile into the camera. */}
          <Animated.View
            pointerEvents={inCamera ? "none" : "auto"}
            style={[StyleSheet.absoluteFill, tileLabelStyle]}
          >
            <Pressable
              accessibilityLabel="Take a photo"
              accessibilityRole="button"
              className={
                cameraLive
                  ? "flex-1 justify-end p-3"
                  : "flex-1 items-center justify-center gap-2"
              }
              onPress={() => void openCamera()}
            >
              {cameraLive ? (
                <View className="flex-row items-center gap-1.5">
                  <AppIcon color="#fff" icon={Camera01Icon} size={18} />
                  <ThemedText size="sm" tone="inverse" weight="medium">
                    Camera
                  </ThemedText>
                </View>
              ) : (
                <>
                  <AppIcon
                    color={colors.foreground}
                    icon={Camera01Icon}
                    size={26}
                  />
                  <ThemedText size="sm" weight="medium">
                    Camera
                  </ThemedText>
                </>
              )}
            </Pressable>
          </Animated.View>

          {/* Full-screen camera controls. */}
          <Animated.View
            pointerEvents={inCamera ? "box-none" : "none"}
            style={[StyleSheet.absoluteFill, controlsStyle]}
          >
            <View
              className="absolute left-0 right-0 flex-row items-center justify-between px-4"
              style={{ top: insets.top + 8 }}
            >
              <CircleButton
                icon={ArrowLeft01Icon}
                label={phase === "review" ? "Retake" : "Back"}
                onPress={goBack}
              />
              {phase === "camera" ? (
                <View className="flex-row gap-3">
                  <CircleButton
                    icon={flash === "on" ? FlashIcon : FlashOffIcon}
                    label={flash === "on" ? "Flash on" : "Flash off"}
                    onPress={() => setFlash((f) => (f === "on" ? "off" : "on"))}
                  />
                  <CircleButton
                    icon={CameraRotated01Icon}
                    label="Switch camera"
                    onPress={() =>
                      setFacing((f) => (f === "back" ? "front" : "back"))
                    }
                  />
                </View>
              ) : null}
            </View>

            <View
              className="absolute left-0 right-0 items-center px-6"
              style={{ bottom: insets.bottom + 24 }}
            >
              {phase === "review" ? (
                <View className="w-full flex-row items-center justify-between">
                  <TextButton
                    label="Retake"
                    onPress={retake}
                    size="md"
                    tone="inverse"
                  />
                  <Button label="Use photo" onPress={acceptPhoto} size="sm" />
                </View>
              ) : (
                <PressableScale
                  accessibilityLabel="Take photo"
                  accessibilityRole="button"
                  disabled={capturing}
                  onPress={() => void takePhoto()}
                  scaleTo={0.9}
                  style={{
                    width: 78,
                    height: 78,
                    borderRadius: 39,
                    borderWidth: 4,
                    borderColor: "#fff",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <View
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 31,
                      backgroundColor: "#fff",
                      opacity: capturing ? 0.6 : 1,
                    }}
                  />
                </PressableScale>
              )}
            </View>
          </Animated.View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

function CircleButton({
  icon,
  label,
  onPress,
}: {
  icon: typeof Camera01Icon;
  label: string;
  onPress: () => void;
}) {
  return (
    <PressableScale
      accessibilityLabel={label}
      accessibilityRole="button"
      className="size-11 items-center justify-center rounded-full"
      hitSlop={8}
      onPress={onPress}
      style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
    >
      <AppIcon color="#fff" icon={icon} size={22} />
    </PressableScale>
  );
}
