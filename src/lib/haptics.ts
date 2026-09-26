import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Fire-and-forget haptic feedback. Haptics are a nicety: a device without a
// Taptic Engine (or with haptics disabled) must never surface an error, so every
// call swallows its rejection.
//
// Use sparingly and only on meaningful taps — saving, rating, picking a chip,
// completing an action. Never on typing, scrolling, or navigation.
//
// On Android, selectionAsync/impactAsync are simulated with a raw Vibrator
// pulse that many phones barely render, so ticks and taps go through the
// system haptics engine instead (the one the keyboard uses) — crisp, and it
// follows the user's system haptics setting.
const isAndroid = Platform.OS === "android";

export const haptics = {
  /** A light tap for toggles — save/unsave, like. */
  tap() {
    (isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Virtual_Key)
      : Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    ).catch(() => {});
  },
  /** A crisp tick for picking a value — stars, chips, segmented controls. */
  select() {
    (isAndroid
      ? Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Clock_Tick)
      : Haptics.selectionAsync()
    ).catch(() => {});
  },
  /** A success buzz for completing something meaningful — posting a review. */
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
};
