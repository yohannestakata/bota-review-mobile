import { useState } from "react";
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

function stateFromEntries(value: SubmissionHoursEntry[]): HoursState {
  const state = emptyState();
  for (const entry of value) {
    state[entry.day] = {
      open: true,
      from: entry.open,
      to: entry.close,
    };
  }
  return state;
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
  const [state, setState] = useState<HoursState>(() => stateFromEntries(value));

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
                <View className="flex-row items-center gap-2">
                  {!state_.open ? (
                    <ThemedText size="sm" tone="muted">
                      Closed
                    </ThemedText>
                  ) : null}
                  <Switch
                    onValueChange={(open) => update(day.key, { open })}
                    value={state_.open}
                  />
                </View>
              </View>
              {state_.open ? (
                <View className="mt-2 flex-row items-center gap-2">
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
              ) : null}
            </View>
          );
        })}
      </View>
    </View>
  );
}
