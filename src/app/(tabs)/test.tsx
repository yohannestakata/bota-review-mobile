import { ScrollView, View } from "react-native";

import { ThemedText } from "@/components/ui/themed-text";

const typeScale = [
  ["5xl", "47.78px"],
  ["4xl", "39.81px"],
  ["3xl", "33.18px"],
  ["2xl", "27.65px"],
  ["xl", "23.04px"],
  ["lg", "19.2px"],
  ["md", "16px"],
  ["sm", "13.33px"],
  ["xs", "11.11px"],
] as const;

export default function TestScreen() {
  return (
    <ScrollView
      className="flex-1 bg-background"
      contentContainerClassName="gap-6 px-6 py-10"
    >
      {typeScale.map(([textSize, size]) => (
        <View key={textSize} className="gap-1">
          <ThemedText size={textSize} weight="semibold">
            text-{textSize}
          </ThemedText>
          <ThemedText size="sm" tone="muted">
            {size}
          </ThemedText>
        </View>
      ))}
    </ScrollView>
  );
}
