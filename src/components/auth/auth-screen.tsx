import { router } from "expo-router";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { SafeAreaView } from "react-native-safe-area-context";

import { BackButton } from "@/components/ui/back-button";
import { ThemedText } from "@/components/ui/themed-text";

type AuthScreenProps = {
  title: string;
  eyebrow?: string;
  body: string;
  footer: ReactNode;
  children: ReactNode;
};

export function AuthScreen({
  title,
  eyebrow,
  body,
  footer,
  children,
}: AuthScreenProps) {
  function goBack() {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/");
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView behavior="padding" className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-6 pb-8 pt-4"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <BackButton onPress={goBack} />

          <View className="mt-6">
            <View>
              {eyebrow ? (
                <ThemedText size="sm" tone="brand" weight="semibold">
                  {eyebrow}
                </ThemedText>
              ) : null}
              <ThemedText
                className={eyebrow ? "mt-3" : undefined}
                size="4xl"
                weight="medium"
              >
                {title}
              </ThemedText>
              <ThemedText className="mt-3" tone="muted">
                {body}
              </ThemedText>
            </View>

            <View className="mt-8 gap-4">{children}</View>
          </View>

          <View className="mt-auto pt-8">{footer}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
