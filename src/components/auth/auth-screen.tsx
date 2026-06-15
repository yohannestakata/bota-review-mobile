import type { ReactNode } from "react";
import { colors } from "@/lib/theme";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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

type AuthButtonProps = {
  label: string;
  loading?: boolean;
  onPress: () => void;
};

type AuthSecondaryButtonProps = AuthButtonProps & {
  icon?: ReactNode;
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
    <View>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoComplete={autoComplete}
        className="mt-2 h-16 rounded-full bg-white px-6 font-outfit text-md text-neutral-950"
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        value={value}
      />
    </View>
  );
}

export function AuthButton({ label, loading, onPress }: AuthButtonProps) {
  return (
    <Pressable
      className="h-16 items-center justify-center rounded-full bg-black px-6"
      disabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={colors.inverse} />
      ) : (
        <ThemedText tone="inverse" weight="semibold">
          {label}
        </ThemedText>
      )}
    </Pressable>
  );
}

export function AuthSecondaryButton({
  icon,
  label,
  loading,
  onPress,
}: AuthSecondaryButtonProps) {
  return (
    <Pressable
      className="h-16 flex-row items-center justify-center gap-3 rounded-full bg-white px-6"
      disabled={loading}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator color={colors.foreground} />
      ) : (
        <>
          {icon}
          <ThemedText weight="semibold">{label}</ThemedText>
        </>
      )}
    </Pressable>
  );
}
