import { EyeIcon, ViewOffIcon } from "@hugeicons/core-free-icons";
import type { ComponentProps, Ref } from "react";
import { useState } from "react";
import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { Pressable, TextInput, View } from "react-native";

import { AppIcon } from "@/components/ui/huge-icon";
import { TextField } from "@/components/ui/text-field";
import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { useColors } from "@/lib/theme";

type NativeTextInputProps = ComponentProps<typeof TextInput>;

type BaseFieldProps = NativeTextInputProps & {
  label: string;
  error?: string;
  containerClassName?: string;
  inputClassName?: string;
  surface?: "default" | "muted";
  /** Show the label as a section heading, for forms laid out as questions. */
  headingLabel?: boolean;
  ref?: Ref<TextInput>;
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
  placeholderTextColor,
  surface = "default",
  secureTextEntry = false,
  style,
  ...props
}: BaseFieldProps) {
  const colors = useColors();
  const [passwordVisible, setPasswordVisible] = useState(false);

  return (
    <View className={containerClassName}>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <View className="relative mt-2">
        <TextField
          className={cn(secureTextEntry && "pr-14", inputClassName)}
          error={Boolean(error)}
          placeholderTextColor={placeholderTextColor ?? colors.muted}
          secureTextEntry={secureTextEntry && !passwordVisible}
          style={style}
          surface={surface}
          textAlignVertical="center"
          {...props}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityLabel={
              passwordVisible ? "Hide password" : "Show password"
            }
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
  placeholderTextColor,
  surface = "default",
  headingLabel = false,
  ...props
}: BaseFieldProps) {
  const colors = useColors();
  return (
    <View className={containerClassName}>
      {headingLabel ? (
        <ThemedText size="xl" weight="bold">
          {label}
        </ThemedText>
      ) : (
        <ThemedText size="sm" weight="medium">
          {label}
        </ThemedText>
      )}
      <TextInput
        maxFontSizeMultiplier={1.6}
        className={cn(
          "mt-2 min-h-24 rounded-xl border bg-surface px-4 py-3 font-outfit text-sm text-foreground",
          surface === "muted" && "bg-background",
          error ? "border-danger" : "border-placeholder",
          inputClassName,
        )}
        multiline
        placeholderTextColor={placeholderTextColor ?? colors.muted}
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
  const {
    field: { ref: inputRef, onBlur, onChange, value },
    fieldState,
  } = useController({ control, name });
  return (
    <FormTextInput
      {...props}
      error={fieldState.error?.message}
      onBlur={onBlur}
      onChangeText={onChange}
      // Lets the form's setFocus() move to this field (e.g. from "Next").
      ref={inputRef}
      value={value ?? ""}
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
