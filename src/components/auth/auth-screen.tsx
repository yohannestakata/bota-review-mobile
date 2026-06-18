import type { ReactNode } from "react";
import { KeyboardAvoidingView, Platform, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { FormTextInput } from "@/components/ui/form-field";
import { ThemedText } from "@/components/ui/themed-text";

type AuthScreenProps = {
  title: string;
  eyebrow: string;
  body: string;
  footer: ReactNode;
  children: ReactNode;
};

type AuthFieldProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoComplete?:
    | "email"
    | "password"
    | "new-password"
    | "one-time-code"
    | "username"
    | "username-new";
  keyboardType?: "default" | "email-address" | "number-pad";
  secureTextEntry?: boolean;
};

export function AuthScreen({
  title,
  eyebrow,
  body,
  footer,
  children,
}: AuthScreenProps) {
  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <View className="flex-1 justify-between px-6 pb-8 pt-6">
          <View>
            <View>
              <ThemedText size="sm" tone="brand" weight="semibold">
                {eyebrow}
              </ThemedText>
              <ThemedText className="mt-3" size="4xl" weight="medium">
                {title}
              </ThemedText>
              <ThemedText className="mt-3" tone="muted">
                {body}
              </ThemedText>
            </View>

            <View className="mt-8 gap-4">{children}</View>
          </View>

          <View className="mt-8">{footer}</View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function AuthField({
  label,
  value,
  onChangeText,
  placeholder,
  autoCapitalize = "none",
  autoComplete,
  keyboardType = "default",
  secureTextEntry,
}: AuthFieldProps) {
  return (
    <FormTextInput
      autoCapitalize={autoCapitalize}
      autoComplete={autoComplete}
      keyboardType={keyboardType}
      label={label}
      onChangeText={onChangeText}
      placeholder={placeholder}
      secureTextEntry={secureTextEntry}
      value={value}
    />
  );
}
