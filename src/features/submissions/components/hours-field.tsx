import { useEffect, useState } from "react";
import { TextInput, View } from "react-native";

import { Switch } from "@/components/ui/switch";
import { ThemedText } from "@/components/ui/themed-text";
import { colors } from "@/lib/theme";

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

// Serializes to a compact, readable string for the submission note, e.g.
// "Mon 09:00–18:00, Tue 09:00–18:00, Sat 10:00–14:00".
function serialize(state: HoursState): string {
  return DAYS.filter((day) => state[day.key].open)
    .map((day) => `${day.short} ${state[day.key].from}–${state[day.key].to}`)
    .join(", ");
}

function TimeInput({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      className="h-10 w-20 rounded-xl border border-placeholder bg-surface px-3 text-center font-outfit text-sm text-foreground"
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      onChangeText={onChangeText}
      placeholder="09:00"
      placeholderTextColor={colors.muted}
      value={value}
    />
  );
}

// A structured opening-hours editor that writes a serialized string up to the
// form. Used in the "report a missing place" submission form.
export function HoursField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const [state, setState] = useState<HoursState>(emptyState);

  // Reset internal state when the form clears the field (e.g. after submit).
  useEffect(() => {
    if (value === "") setState(emptyState());
  }, [value]);

  function update(key: DayKey, patch: Partial<DayState>) {
    setState((prev) => {
      const next = { ...prev, [key]: { ...prev[key], ...patch } };
      onChangeText(serialize(next));
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
                  <TimeInput
                    onChangeText={(from) => update(day.key, { from })}
                    value={state_.from}
                  />
                  <ThemedText tone="muted">–</ThemedText>
                  <TimeInput
                    onChangeText={(to) => update(day.key, { to })}
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
