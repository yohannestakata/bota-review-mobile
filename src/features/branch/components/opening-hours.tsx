import { View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

import type { BranchHours } from "../api";
import { formatDayHours, todayKey, WEEK } from "../hours";

export function OpeningHours({ hours }: { hours: BranchHours }) {
  const today = todayKey();

  return (
    <View className="gap-2">
      {WEEK.map((day) => {
        const isToday = day.key === today;
        return (
          <View className="flex-row justify-between" key={day.key}>
            <ThemedText
              tone={isToday ? "default" : "muted"}
              weight={isToday ? "semibold" : "normal"}
            >
              {day.label}
            </ThemedText>
            <ThemedText
              tone={isToday ? "default" : "muted"}
              weight={isToday ? "medium" : "normal"}
            >
              {formatDayHours(hours[day.key])}
            </ThemedText>
          </View>
        );
      })}
    </View>
  );
}
