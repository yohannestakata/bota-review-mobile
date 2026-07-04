import { useEffect, useState } from "react";
import { View } from "react-native";

import { Switch } from "@/components/ui/switch";
import { ThemedText } from "@/components/ui/themed-text";
import { TimeField } from "@/components/ui/time-field";

import type { SubmissionHoursEntry } from "../api";

const DAYS = [
  { key: "mon", short: "Mon", label: "Monday" },
  { key: "tue", short: "Tue", label: "Tuesday" },
  { key: "wed", short: "Wed", label: "Wednesday" },
  { key: "thu", short: "Thu", label: "Thursday" },
  { key: "fri", short: "Fri", label: "Friday" },
  { key: "sat", short: "Sat", label: "Saturday" },
  { key: "sun", short: "Sun", label: "Sunday" },
] as const;

type DayKey = (typeof DAYS)[number]["key"];
type DayState = { open: boolean; from: string; to: string };
type HoursState = Record<DayKey, DayState>;

function emptyState(): HoursState {
  return DAYS.reduce((acc, day) => {
    acc[day.key] = { open: false, from: "09:00", to: "18:00" };
    return acc;
  }, {} as HoursState);
}

// Structured open-day entries for the submission (only the open days).
function toEntries(state: HoursState): SubmissionHoursEntry[] {
  return DAYS.filter((day) => state[day.key].open).map((day) => ({
    day: day.key,
    open: state[day.key].from,
    close: state[day.key].to,
  }));
}

// A structured opening-hours editor that emits SubmissionHoursEntry[]. Used in
// the submission and suggest-edit forms.
export function HoursField({
  value,
  onChange,
}: {
  value: SubmissionHoursEntry[];
  onChange: (value: SubmissionHoursEntry[]) => void;
}) {
  const [state, setState] = useState<HoursState>(emptyState);

  // Reset internal state when the form clears the field (e.g. after submit).
  useEffect(() => {
    if (value.length === 0) setState(emptyState());
  }, [value]);

  function update(key: DayKey, patch: Partial<DayState>) {
    setState((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      onChange(toEntries(next));
      return next;
    });
  }

  return (
    <View className="gap-2">
      <ThemedText size="sm" weight="medium">
        Hours
      </ThemedText>
      <View className="gap-2">
        {DAYS.map((day) => {
          const state_ = state[day.key];
          return (
            <View
              key={day.key}
              className="rounded-2xl border border-placeholder bg-background p-3"
            >
              <View className="flex-row items-center justify-between">
                <ThemedText weight="medium">{day.label}</ThemedText>
                <Switch
                  onValueChange={(open) => update(day.key, { open })}
                  value={state_.open}
                />
              </View>
              {state_.open ? (
                <View className="mt-3 flex-row items-center gap-2">
                  <TimeField
                    onChange={(from) => update(day.key, { from })}
                    value={state_.from}
                  />
                  <ThemedText tone="muted">–</ThemedText>
                  <TimeField
                    onChange={(to) => update(day.key, { to })}
                    value={state_.to}
                  />
                </View>
              ) : (
                <ThemedText className="mt-1" size="sm" tone="muted">
                  Closed
                </ThemedText>
              )}
            </View>
          );
        })}
      </View>
    </View>
  );
}
