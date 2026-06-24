import { router, useFocusEffect } from "expo-router";
import { useCallback } from "react";
import { BackHandler } from "react-native";

import { Alert } from "@/components/ui/alert";

// Guards a dirty form against accidental loss: returns an `attemptClose` to wire
// to the screen's close (✕) control, and intercepts the Android hardware back
// button. When the form is clean, both paths just pop the route.
export function useDiscardConfirm(isDirty: boolean): () => void {
  const attemptClose = useCallback(() => {
    if (!isDirty) {
      router.back();
      return;
    }
    Alert.alert("Discard changes?", "Your unsaved changes will be lost.", [
      { text: "Keep editing", style: "cancel" },
      { text: "Discard", style: "destructive", onPress: () => router.back() },
    ]);
  }, [isDirty]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        if (!isDirty) {
          return false;
        }
        attemptClose();
        return true;
      });
      return () => sub.remove();
    }, [isDirty, attemptClose]),
  );

  return attemptClose;
}
