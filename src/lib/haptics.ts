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
  /**
   * One beat of a build-up — e.g. stars stamping in one by one. Each step lands
   * a little firmer than the last (`step` of `total`, 0-based), so a sequence
   * reads as a crescendo instead of identical ticks. End it with `success()`.
   */
  build(step: number, total: number) {
    const t = total > 1 ? step / (total - 1) : 1;
    if (isAndroid) {
      Haptics.performAndroidHapticsAsync(
        t < 0.5
          ? Haptics.AndroidHaptics.Clock_Tick
          : Haptics.AndroidHaptics.Virtual_Key,
      ).catch(() => {});
      return;
    }
    const styles = [
      Haptics.ImpactFeedbackStyle.Soft,
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Rigid,
    ];
    Haptics.impactAsync(
      styles[Math.min(styles.length - 1, Math.round(t * (styles.length - 1)))],
    ).catch(() => {});
  },
  /** A success buzz for completing something meaningful — posting a review. */
  success() {
    // Android 11+ has a real "confirm" haptic; the Vibrator-based notification
    // pattern is a coarse buzz, so only older phones fall back to it.
    if (isAndroid && Number(Platform.Version) >= 30) {
      Haptics.performAndroidHapticsAsync(Haptics.AndroidHaptics.Confirm).catch(
        () => {},
      );
      return;
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
};
