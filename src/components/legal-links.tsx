import { Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { openLegal, PRIVACY_POLICY_URL, TERMS_URL } from "@/lib/legal";

// Compact "Privacy Policy · Terms of Service" row — for settings/profile.
export function LegalLinks() {
  return (
    <View className="flex-row items-center justify-center gap-3">
      <Pressable hitSlop={6} onPress={() => openLegal(PRIVACY_POLICY_URL)}>
        <ThemedText size="xs" tone="muted">
          Privacy Policy
        </ThemedText>
      </Pressable>
      <ThemedText size="xs" tone="muted">
        ·
      </ThemedText>
      <Pressable hitSlop={6} onPress={() => openLegal(TERMS_URL)}>
        <ThemedText size="xs" tone="muted">
          Terms of Service
        </ThemedText>
      </Pressable>
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
