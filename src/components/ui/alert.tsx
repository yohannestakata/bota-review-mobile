import { useEffect, useState, type ReactNode } from "react";
import { Modal, Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";
import { cn } from "@/lib/cn";

export type AlertButtonStyle = "default" | "cancel" | "destructive";

export type AlertButton = {
  text: string;
  style?: AlertButtonStyle;
  onPress?: () => void;
};

export type AlertOptions = {
  title: string;
  message?: string;
  buttons?: AlertButton[];
};

// Module-level handler registered by the mounted AlertProvider. This lets
// `Alert.alert(...)` be called imperatively from anywhere — event handlers,
// async functions, mutation callbacks — exactly like React Native's Alert.
let handler: ((options: AlertOptions) => void) | null = null;

/**
 * Drop-in replacement for React Native's `Alert`, rendered with our own
 * themed dialog. Requires <AlertProvider> mounted near the app root.
 */
export const Alert = {
  alert(title: string, message?: string, buttons?: AlertButton[]) {
    if (handler) {
      handler({ title, message, buttons });
    } else if (__DEV__) {
      console.warn("Alert.alert called but <AlertProvider> is not mounted.");
    }
  },
};

function DialogButton({
  button,
  full,
  onPress,
}: {
  button: AlertButton;
  full: boolean;
  onPress: () => void;
}) {
  const style = button.style ?? "default";

  return (
    <Pressable
      className={cn(
        "h-14 flex-row items-center justify-center rounded-full px-6",
        full ? "w-full" : "flex-1",
        style === "destructive" && "bg-danger",
        style === "cancel" && "border border-placeholder bg-background",
        style === "default" && "bg-primary",
      )}
      onPress={onPress}
    >
      <ThemedText
        tone={style === "cancel" ? "default" : "inverse"}
        weight="semibold"
      >
        {button.text}
      </ThemedText>
    </Pressable>
  );
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<AlertOptions | null>(null);

  useEffect(() => {
    handler = setOptions;
    return () => {
      handler = null;
    };
  }, []);

  function dismiss() {
    setOptions(null);
  }

  function press(button: AlertButton) {
    dismiss();
    button.onPress?.();
  }

  const buttons = options?.buttons?.length
    ? options.buttons
    : [{ text: "OK" } satisfies AlertButton];

  // Tapping the backdrop mirrors pressing the cancel button when one exists,
  // and is otherwise a no-op (matching iOS Alert behaviour).
  const cancelButton = buttons.find((b) => b.style === "cancel");
  function onBackdrop() {
    if (cancelButton) {
      press(cancelButton);
    }
  }

  // Two buttons sit side by side; one or three+ stack vertically.
  const row = buttons.length === 2;

  return (
    <>
      {children}
      <Modal
        animationType="fade"
        onRequestClose={onBackdrop}
        statusBarTranslucent
        transparent
        visible={options != null}
      >
        <View className="flex-1 items-center justify-center px-10">
          <Pressable
            className="absolute inset-0 bg-black/40"
            onPress={onBackdrop}
          />
          {options ? (
            <View className="w-full max-w-sm rounded-3xl bg-surface p-6">
              <ThemedText size="lg" weight="semibold">
                {options.title}
              </ThemedText>
              {options.message ? (
                <ThemedText className="mt-2" tone="muted">
                  {options.message}
                </ThemedText>
              ) : null}

              <View className={cn("mt-6 gap-3", row && "flex-row")}>
                {buttons.map((button, index) => (
                  <DialogButton
                    button={button}
                    full={!row}
                    key={`${button.text}-${index}`}
                    onPress={() => press(button)}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </>
  );
}
