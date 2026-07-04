import type { ComponentProps, ReactNode } from "react";
import { TextInput, View } from "react-native";

import { cn } from "@/lib/cn";
import { colors } from "@/lib/theme";

// The one source of truth for input styling. Used by TextField (and therefore
// every field built on it).
export function fieldInputClass(opts?: {
  surface?: "default" | "muted";
  error?: boolean;
}): string {
  const { surface = "default", error } = opts ?? {};
  return cn(
    "h-14 rounded-xl border px-4 py-0 font-outfit text-md text-foreground",
    surface === "muted" ? "bg-background" : "bg-surface",
    error ? "border-danger" : "border-placeholder",
  );
}

export type TextFieldProps = ComponentProps<typeof TextInput> & {
  surface?: "default" | "muted";
  error?: boolean;
  // Trailing element rendered inside the field, e.g. a "Br" price suffix.
  suffix?: ReactNode;
};

// The reusable single-line input. Import and use this anywhere a text field is
// needed so every input looks identical.
export function TextField({
  surface = "default",
  error,
  suffix,
  className,
  style,
  placeholderTextColor = colors.muted,
  ...props
}: TextFieldProps) {
  const input = (
    <TextInput
      className={cn(
        suffix
          ? "flex-1 py-0 font-outfit text-md text-foreground"
          : cn(fieldInputClass({ surface, error }), className),
      )}
      placeholderTextColor={placeholderTextColor}
      style={[{ includeFontPadding: false, lineHeight: 16 }, style]}
      {...props}
    />
  );

  if (!suffix) return input;

  return (
    <View
      className={cn(
        fieldInputClass({ surface, error }),
        "flex-row items-center gap-1",
        className,
      )}
    >
      {input}
      {suffix}
    </View>
  );
}
