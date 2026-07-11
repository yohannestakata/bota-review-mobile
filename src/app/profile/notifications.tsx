import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Alert } from "@/components/ui/alert";
import { CloseButton } from "@/components/ui/close-button";
import { Switch } from "@/components/ui/switch";
import { ThemedText } from "@/components/ui/themed-text";
import {
  DEFAULT_MEAL_REMINDERS,
  getMealReminderPreferences,
  MEAL_REMINDERS,
  saveMealReminderPreferences,
  type MealReminder,
  type MealReminderPreferences,
} from "@/lib/meal-notifications";
import { colors } from "@/lib/theme";

export default function NotificationPreferencesScreen() {
  const [preferences, setPreferences] = useState<MealReminderPreferences>(
    DEFAULT_MEAL_REMINDERS,
  );
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState<MealReminder | null>(null);

  useEffect(() => {
    void getMealReminderPreferences().then((stored) => {
      setPreferences(stored);
      setReady(true);
    });
  }, []);

  async function toggle(key: MealReminder) {
    if (saving) return;
    const next = { ...preferences, [key]: !preferences[key] };
    setSaving(key);
    try {
      await saveMealReminderPreferences(next);
      setPreferences(next);
    } catch {
      Alert.alert(
        "Notifications are off",
        "Turn them on in Settings, then try again.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Open Settings", onPress: () => void Linking.openSettings() },
        ],
      );
    } finally {
      setSaving(null);
    }
  }

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center justify-between px-4 py-3">
        <CloseButton onPress={() => router.back()} />
        <ThemedText size="xl" weight="bold">
          Meal reminders
        </ThemedText>
        <View className="w-6" />
      </View>

      <View className="px-6 pt-3">
        <ThemedText tone="muted">
          A little nudge when it&apos;s time to eat.
        </ThemedText>

        {!ready ? (
          <View className="mt-12 items-center">
            <ActivityIndicator color={colors.muted} />
          </View>
        ) : (
          <View className="mt-5">
            {MEAL_REMINDERS.map((meal, index) => (
              <View
                className={`flex-row items-center gap-3 py-4 ${index > 0 ? "border-t border-border" : ""}`}
                key={meal.key}
              >
                <View className="flex-1">
                  <ThemedText weight="medium">{meal.label}</ThemedText>
                  <ThemedText size="sm" tone="muted">
                    {meal.time}
                  </ThemedText>
                </View>
                {saving === meal.key ? (
                  <ActivityIndicator color={colors.muted} />
                ) : (
                  <Switch
                    onValueChange={() => void toggle(meal.key)}
                    value={preferences[meal.key]}
                  />
                )}
              </View>
            ))}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
