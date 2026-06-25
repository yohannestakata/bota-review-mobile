import { EyeIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import type { ComponentProps } from "react";
import { useState } from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Pressable, TextInput, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

type NativeTextInputProps = ComponentProps<typeof TextInput>;

type BaseFieldProps = NativeTextInputProps & {
  label: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
  surface?: "default" | "muted";
};

function FieldError({ error }: { error?: string }) {
  if (!error) {
    return null;
  }
  return (
    <ThemedText className="mt-1.5" size="sm" tone="danger">
      {error}
    </ThemedText>
  );
}

export function FormTextInput({
  label,
  error,
  containerClassName = "",
  inputClassName = "",
  placeholderTextColor = colors.muted,
  surface = "default",
  secureTextEntry = false,
  style,
  ...props
}: BaseFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View className={containerClassName}>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <View className="relative mt-2">
        <TextInput
          className={cn(
            "h-14 rounded-xl border bg-surface px-4 py-0 font-outfit text-md text-foreground",
            secureTextEntry && "pr-14",
            surface === "muted" && "bg-background",
            error ? "border-danger" : "border-placeholder",
            inputClassName,
          )}
          placeholderTextColor={placeholderTextColor}
          secureTextEntry={secureTextEntry && !passwordVisible}
          style={[{ includeFontPadding: false, lineHeight: 16 }, style]}
          textAlignVertical="center"
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={passwordVisible ? "Hide password" : "Show password"}
            accessibilityRole="button"
            className="absolute right-0 top-0 h-14 w-14 items-center justify-center"
            hitSlop={4}
            onPress={() => setPasswordVisible((visible) => !visible)}
          >
            <AppIcon
              color={colors.muted}
              icon={passwordVisible ? ViewOffIcon : EyeIcon}
              size={20}
            />
          </Pressable>
        ) : null}
      </View>
      <FieldError error={error} />
    </View>
  );
}

export function FormTextArea({
  label,
  error,
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
          "mt-2 min-h-24 rounded-xl border bg-surface px-4 py-3 font-outfit text-md text-foreground",
          surface === "muted" && "bg-background",
          error ? "border-danger" : "border-placeholder",
          inputClassName,
        )}
        multiline
        placeholderTextColor={placeholderTextColor}
        textAlignVertical="top"
        {...props}
      />
      <FieldError error={error} />
    </View>
  );
}

type ControlledFieldProps<T extends FieldValues> = Omit<
  BaseFieldProps,
  "value" | "onChangeText" | "onBlur" | "error"
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/**
 * `FormTextInput` wired to a React Hook Form field. Surfaces the field's
 * validation error and forwards value/onChange/onBlur automatically.
 */
export function ControlledTextInput<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <FormTextInput
      {...props}
      error={fieldState.error?.message}
      onBlur={field.onBlur}
      onChangeText={field.onChange}
      value={field.value ?? ""}
    />
  );
}

/** `FormTextArea` wired to a React Hook Form field. */
export function ControlledTextArea<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledFieldProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <FormTextArea
      {...props}
      error={fieldState.error?.message}
      onBlur={field.onBlur}
      onChangeText={field.onChange}
      value={field.value ?? ""}
    />
  );
}
