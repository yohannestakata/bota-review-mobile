import DateTimePicker from "@react-native-community/datetimepicker";
import { useState } from "react";
import { Pressable } from "react-native";

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

// A "HH:MM" time value edited via the native time picker (tap to open).
// Mirrors the date-picker pattern used on the review screen.
export function TimeField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [show, setShow] = useState(false);

  return (
    <>
      <Pressable
        className="h-10 justify-center rounded-xl border border-placeholder bg-surface px-4"
        onPress={() => setShow(true)}
      >
        <ThemedText size="sm">{value}</ThemedText>
      </Pressable>
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
