import * as Haptics from "expo-haptics";

// Fire-and-forget haptic feedback. Haptics are a nicety: a device without a
// Taptic Engine (or with haptics disabled) must never surface an error, so every
// call swallows its rejection.
//
// Use sparingly and only on meaningful taps — saving, rating, picking a chip,
// completing an action. Never on typing, scrolling, or navigation.
export const haptics = {
  /** A light tap for toggles — save/unsave, like. */
  tap() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** A crisp tick for picking a value — stars, chips, segmented controls. */
  select() {
    Haptics.selectionAsync().catch(() => {});
  },
  /** A success buzz for completing something meaningful — posting a review. */
  success() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
  },
};
