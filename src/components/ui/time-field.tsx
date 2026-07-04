import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Modal, Platform, Pressable, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

function parseTime(value: string): Date {
  const [h, m] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(Number.isFinite(h) ? h : 9, Number.isFinite(m) ? m : 0, 0, 0);
  return date;
}

function formatTime(date: Date): string {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// A "HH:MM" time value edited via the native time picker. On Android the picker
// pops as a native dialog; on iOS we present the wheel in a slide-up modal so
// tapping the field opens a picker immediately (iOS' inline "compact" picker
// otherwise renders beside the field).
export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);
  const [draft, setDraft] = useState<Date>(() => parseTime(value));

  function open() {
    setDraft(parseTime(value));
    setShow(true);
  }

  const field = (
    <Pressable
      className="h-10 justify-center rounded-xl border border-placeholder bg-surface px-4"
      onPress={open}
    >
      <ThemedText size="sm">{value}</ThemedText>
    </Pressable>
  );

  if (Platform.OS === "ios") {
    return (
      <>
        {field}
        <Modal
          animationType="slide"
          onRequestClose={() => setShow(false)}
          transparent
          visible={show}
        >
          <Pressable
            className="flex-1 justify-end bg-black/40"
            onPress={() => setShow(false)}
          >
            <Pressable
              className="rounded-t-3xl bg-surface pb-8"
              onPress={(event) => event.stopPropagation()}
            >
              <View className="flex-row justify-end px-5 py-3">
                <Pressable
                  hitSlop={8}
                  onPress={() => {
                    onChange(formatTime(draft));
                    setShow(false);
                  }}
                >
                  <ThemedText tone="brand" weight="semibold">
                    Done
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                display="spinner"
                mode="time"
                onChange={(_event, date) => {
                  if (date) setDraft(date);
                }}
                value={draft}
              />
            </Pressable>
          </Pressable>
        </Modal>
      </>
    );
  }

  return (
    <>
      {field}
      {show ? (
        <DateTimePicker
          mode="time"
          onChange={(event, date) => {
            setShow(false);
            if (event.type === "set" && date) onChange(formatTime(date));
          }}
          value={parseTime(value)}
        />
      ) : null}
    </>
  );
}
