import { Alert02Icon, CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pressable, View } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  Keyframe,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { shadows, useColors } from "@/lib/theme";

type ToastKind = "success" | "error";
type ToastData = {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
};

// Module-level handler registered by the mounted ToastProvider, so `toast.*`
// can be called from anywhere (handlers, mutation callbacks) like Alert.
let show: ((t: Omit<ToastData, "id">) => void) | null = null;

/**
 * Lightweight, self-dismissing confirmation for things that need no decision
 * ("Reply posted", "Couldn't send report"). Use Alert only when the user has
 * to choose something.
 */
export const toast = {
  success(title: string, message?: string) {
    show?.({ kind: "success", title, message });
  },
  error(title: string, message?: string) {
    show?.({ kind: "error", title, message });
  },
};

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
// Occasional tier: drops in 12px with a fade, leaves faster than it arrives.
const ENTER = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: -12 }, { scale: 0.97 }] },
  100: {
    opacity: 1,
    transform: [{ translateY: 0 }, { scale: 1 }],
    easing: EASE_OUT,
  },
}).duration(220);
const EXIT = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: -8 }], easing: EASE_OUT },
}).duration(160);

const DURATION = { success: 2600, error: 4200 };

export function ToastProvider({ children }: { children: ReactNode }) {
  const colors = useColors();
  const [current, setCurrent] = useState<ToastData | null>(null);
  const nextId = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();

  useEffect(() => {
    show = (t) => {
      nextId.current += 1;
      setCurrent({ ...t, id: nextId.current });
    };
    return () => {
      show = null;
    };
  }, []);

  useEffect(() => {
    if (!current) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCurrent(null), DURATION[current.kind]);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [current]);

  const isError = current?.kind === "error";

  return (
    <>
      {children}
      <View
        pointerEvents="box-none"
        style={{
          position: "absolute",
          top: insets.top + 8,
          left: 16,
          right: 16,
        }}
      >
        {current ? (
          <Animated.View
            entering={reduced ? FadeIn.duration(150) : ENTER}
            exiting={reduced ? FadeOut.duration(120) : EXIT}
            key={current.id}
          >
            <Pressable
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              className="flex-row items-center gap-3 rounded-2xl px-4 py-3"
              onPress={() => setCurrent(null)}
              style={[shadows.navigation, { backgroundColor: colors.pill }]}
            >
              <AppIcon
                color={isError ? colors.accent : colors.inverse}
                icon={isError ? Alert02Icon : CheckmarkCircle02Icon}
                size={20}
              />
              <View className="flex-1">
                <ThemedText size="sm" tone="inverse" weight="semibold">
                  {current.title}
                </ThemedText>
                {current.message ? (
                  <ThemedText className="opacity-80" size="sm" tone="inverse">
                    {current.message}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          </Animated.View>
        ) : null}
      </View>
    </>
  );
}
