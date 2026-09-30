import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { openLegal, PRIVACY_POLICY_URL, TERMS_URL } from "@/lib/legal";
import { PressableFade } from "@/components/ui/pressable-scale";

// Compact "Privacy Policy · Terms of Service" row — for settings/profile.
export function LegalLinks() {
  return (
    <View className="flex-row items-center justify-center gap-3">
      <PressableFade hitSlop={6} onPress={() => openLegal(PRIVACY_POLICY_URL)}>
        <ThemedText size="xs" tone="muted">
          Privacy Policy
        </ThemedText>
      </PressableFade>
      <ThemedText size="xs" tone="muted">
        ·
      </ThemedText>
      <PressableFade hitSlop={6} onPress={() => openLegal(TERMS_URL)}>
        <ThemedText size="xs" tone="muted">
          Terms of Service
        </ThemedText>
      </PressableFade>
    </View>
  );
}

// Consent sentence with tappable links — for sign-in / sign-up.
export function LegalAgreement() {
  return (
    <ThemedText className="text-center" size="xs" tone="muted">
      By continuing, you agree to our{" "}
      <ThemedText
        onPress={() => openLegal(TERMS_URL)}
        size="xs"
        tone="brand"
        weight="medium"
      >
        Terms of Service
      </ThemedText>{" "}
      and{" "}
      <ThemedText
        onPress={() => openLegal(PRIVACY_POLICY_URL)}
        size="xs"
        tone="brand"
        weight="medium"
      >
        Privacy Policy
      </ThemedText>
      .
    </ThemedText>
  );
}
