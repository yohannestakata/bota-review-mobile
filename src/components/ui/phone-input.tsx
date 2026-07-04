import {
  useController,
  type Control,
  type FieldPath,
  type FieldValues,
} from "react-hook-form";
import { TextInput, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

const COUNTRY_CODE = "+251"; // Ethiopia

// Strips a value down to the 9-digit local subscriber number (no country code,
// no leading 0). Handles inputs like "+251911…", "0911…", "251 911…".
function toLocalDigits(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.startsWith("251")) digits = digits.slice(3);
  if (digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 9);
}

// Groups the local digits for display, e.g. "912 345 678".
function groupLocal(digits: string): string {
  return digits
    .replace(/(\d{3})(\d{0,3})(\d{0,3})/, (_, a, b, c) =>
      [a, b, c].filter(Boolean).join(" "),
    )
    .trim();
}

type PhoneInputProps = {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  onBlur?: () => void;
  error?: string;
  placeholder?: string;
  surface?: "default" | "muted";
  containerClassName?: string;
};

// Phone number field with a fixed +251 prefix. Stores the full E.164 number
// (e.g. "+251912345678") and shows the grouped local number.
export function PhoneInput({
  label,
  value,
  onChangeText,
  onBlur,
  error,
  placeholder = "9XX XXX XXX",
  surface = "default",
  containerClassName = "",
}: PhoneInputProps) {
  const local = toLocalDigits(value);

  return (
    <View className={containerClassName}>
      <ThemedText size="sm" weight="medium">
        {label}
      </ThemedText>
      <View
        className={cn(
          "mt-2 h-14 flex-row items-center rounded-xl border bg-surface px-4",
          surface === "muted" && "bg-background",
          error ? "border-danger" : "border-placeholder",
        )}
      >
        <ThemedText tone="muted">{COUNTRY_CODE}</ThemedText>
        <View className="mx-3 h-6 w-px bg-border" />
        <TextInput
          className="flex-1 py-0 font-outfit text-md text-foreground"
          keyboardType="phone-pad"
          maxLength={11}
          onBlur={onBlur}
          onChangeText={(text) => {
            const digits = toLocalDigits(text);
            onChangeText(digits ? `${COUNTRY_CODE}${digits}` : "");
          }}
          placeholder={placeholder}
          placeholderTextColor={colors.muted}
          style={{ includeFontPadding: false, lineHeight: 16 }}
          textAlignVertical="center"
          value={groupLocal(local)}
        />
      </View>
      {error ? (
        <ThemedText className="mt-1.5" size="sm" tone="danger">
          {error}
        </ThemedText>
      ) : null}
    </View>
  );
}

type ControlledPhoneInputProps<T extends FieldValues> = Omit<
  PhoneInputProps,
  "value" | "onChangeText" | "onBlur" | "error"
> & {
  control: Control<T>;
  name: FieldPath<T>;
};

/** `PhoneInput` wired to a React Hook Form field. */
export function ControlledPhoneInput<T extends FieldValues>({
  control,
  name,
  ...props
}: ControlledPhoneInputProps<T>) {
  const { field, fieldState } = useController({ control, name });
  return (
    <PhoneInput
      {...props}
      error={fieldState.error?.message}
      onBlur={field.onBlur}
      onChangeText={field.onChange}
      value={field.value ?? ""}
    />
  );
}
