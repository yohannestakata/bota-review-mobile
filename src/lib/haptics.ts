import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

// Fire-and-forget haptic feedback. Haptics are a nicety: a device without a
// Taptic Engine (or with haptics disabled) must never surface an error, so every
// call swallows its rejection.
//
// Use sparingly and only on meaningful taps — saving, rating, picking a chip,
// completing an action. Never on typing, scrolling, or navigation.
//
// Stick to expo-haptics' standard calls. On Android these drive the vibration
// motor directly, so they work on every phone. (performAndroidHapticsAsync goes
// through the system's touch-feedback setting instead, which many phones —
// Xiaomi in particular — leave off or suppress, so it was silent there.)
const isAndroid = Platform.OS === "android";

export const haptics = {
  /** A light tap for toggles — save/unsave, like. */
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** A crisp tick for picking a value — stars, chips, segmented controls. */
  select() {
    // Android's selection pulse is 50ms at ~12% strength — too faint to feel on
    // many motors — so ticks use the medium impact pulse there.
    (isAndroid
      ? Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      : Haptics.selectionAsync()
    ).catch(() => {});
  },
  /**
   * One beat of a build-up — e.g. stars stamping in one by one. Each step lands
   * a little firmer than the last (`step` of `total`, 0-based). End it with
   * `success()`.
   */
  build(step: number, total: number) {
    const styles = [
      Haptics.ImpactFeedbackStyle.Light,
      Haptics.ImpactFeedbackStyle.Medium,
      Haptics.ImpactFeedbackStyle.Heavy,
    ];
    const t = total > 1 ? step / (total - 1) : 1;
    Haptics.impactAsync(
      styles[Math.min(styles.length - 1, Math.round(t * (styles.length - 1)))],
    ).catch(() => {});
  },
  /** A success buzz for completing something meaningful — posting a review. */
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
};
