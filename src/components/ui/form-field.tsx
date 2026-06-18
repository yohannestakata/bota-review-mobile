import type { ComponentProps } from "react";
import { TextInput, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

type NativeTextInputProps = ComponentProps<typeof TextInput>;

type BaseFieldProps = NativeTextInputProps & {
  label: string;
  containerClassName?: string;
  inputClassName?: string;
  surface?: "default" | "muted";
};

export function FormTextInput({
  label,
  containerClassName = "",
  inputClassName = "",
  placeholderTextColor = colors.muted,
  surface = "default",
  style,
  ...props
}: BaseFieldProps) {
  return (
    <View className={containerClassName}>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <TextInput
        className={cn(
          "mt-2 h-14 rounded-xl bg-surface px-4 py-0 font-outfit text-md text-foreground",
          surface === "muted" && "bg-background",
          inputClassName,
        )}
        placeholderTextColor={placeholderTextColor}
        style={[{ includeFontPadding: false, lineHeight: 16 }, style]}
        textAlignVertical="center"
        {...props}
      />
    </View>
  );
}

export function FormTextArea({
  label,
  containerClassName = "",
  inputClassName = "",
  placeholderTextColor = colors.muted,
  surface = "default",
  ...props
}: BaseFieldProps) {
  return (
    <View className={containerClassName}>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <TextInput
        className={cn(
          "mt-2 min-h-24 rounded-xl bg-surface px-4 py-3 font-outfit text-md text-foreground",
          surface === "muted" && "bg-background",
          inputClassName,
        )}
        multiline
        placeholderTextColor={placeholderTextColor}
        textAlignVertical="top"
        {...props}
      />
    </View>
  );
}
