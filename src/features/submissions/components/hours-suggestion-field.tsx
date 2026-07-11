import { useState } from "react";
import { View } from "react-native";

import { ChipButton } from "@/components/ui/button";
import { ThemedText } from "@/components/ui/themed-text";
import { TimeField } from "@/components/ui/time-field";
import type { BranchHours } from "@/features/branch/api";

import type { SubmissionHourChange } from "../api";

const DAYS = [
  ["mon", "Mon"],
  ["tue", "Tue"],
  ["wed", "Wed"],
  ["thu", "Thu"],
  ["fri", "Fri"],
  ["sat", "Sat"],
  ["sun", "Sun"],
] as const;
type Day = (typeof DAYS)[number][0];

export function HoursSuggestionField({
  current,
  onChange,
}: {
  current: BranchHours | null;
  onChange: (changes: SubmissionHourChange[]) => void;
}) {
  const [day, setDay] = useState<Day | null>(null);
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState("09:00");
  const [to, setTo] = useState("18:00");

  function chooseDay(next: Day) {
    const slot = current?.[next]?.[0];
    setDay(next);
    setOpen(Boolean(slot));
    setFrom(slot?.[0] ?? "09:00");
    setTo(slot?.[1] ?? "18:00");
    onChange([]);
  }

  function emit(nextOpen: boolean, nextFrom = from, nextTo = to) {
    if (!day) return;
    const existing = current?.[day]?.[0];
    if (!nextOpen) {
      onChange(existing ? [{ operation: "close", day }] : []);
      return;
    }
    onChange(
      existing?.[0] === nextFrom && existing?.[1] === nextTo
        ? []
        : [
            {
              operation: "set",
              day,
              open: nextFrom,
              close: nextTo,
            },
          ],
    );
  }

  return (
    <View className="gap-3">
      <ThemedText size="sm" weight="medium">
        Choose a day
      </ThemedText>
      <View className="flex-row flex-wrap gap-2">
        {DAYS.map(([value, label]) => (
          <ChipButton
            key={value}
            label={label}
            onPress={() => chooseDay(value)}
            selected={day === value}
          />
        ))}
      </View>

      {day ? (
        <View className="gap-3">
          <View className="flex-row gap-2">
            <ChipButton
              label="Open"
              onPress={() => {
                setOpen(true);
                emit(true);
              }}
              selected={open}
            />
            <ChipButton
              label="Closed"
              onPress={() => {
                setOpen(false);
                emit(false);
              }}
              selected={!open}
            />
          </View>
          {open ? (
            <View className="flex-row items-center gap-2">
              <TimeField
                onChange={(value) => {
                  setFrom(value);
                  emit(true, value, to);
                }}
                value={from}
              />
              <ThemedText tone="muted">to</ThemedText>
              <TimeField
                onChange={(value) => {
                  setTo(value);
                  emit(true, from, value);
                }}
                value={to}
              />
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
