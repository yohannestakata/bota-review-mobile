import * as Notifications from "expo-notifications";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

export type MealReminder = "breakfast" | "lunch" | "dinner" | "lateNight";
export type MealReminderPreferences = Record<MealReminder, boolean>;

const PREFERENCES_KEY = "bota.meal-reminder-preferences";
const IDENTIFIERS_KEY = "bota.meal-reminder-identifiers";
const CHANNEL_ID = "meal-reminders";

export const DEFAULT_MEAL_REMINDERS: MealReminderPreferences = {
  breakfast: false,
  lunch: false,
  dinner: false,
  lateNight: false,
};

export const MEAL_REMINDERS: {
  key: MealReminder;
  label: string;
  time: string;
  hour: number;
  title: string;
  body: string;
}[] = [
  {
    key: "breakfast",
    label: "Breakfast",
    time: "8:00 AM",
    hour: 8,
    title: "What's for breakfast?",
    body: "See what looks good nearby.",
  },
  {
    key: "lunch",
    label: "Lunch",
    time: "12:00 PM",
    hour: 12,
    title: "Lunch plans?",
    body: "A good spot might be closer than you think.",
  },
  {
    key: "dinner",
    label: "Dinner",
    time: "6:00 PM",
    hour: 18,
    title: "Dinner plans?",
    body: "Find somewhere worth sitting down for.",
  },
  {
    key: "lateNight",
    label: "Late night",
    time: "10:00 PM",
    hour: 22,
    title: "Still hungry?",
    body: "Have a look at what's open late.",
  },
];

export async function getMealReminderPreferences() {
  const stored = await SecureStore.getItemAsync(PREFERENCES_KEY);
  if (!stored) return DEFAULT_MEAL_REMINDERS;
  try {
    return {
      ...DEFAULT_MEAL_REMINDERS,
      ...(JSON.parse(stored) as Partial<MealReminderPreferences>),
    };
  } catch {
    return DEFAULT_MEAL_REMINDERS;
  }
}

async function cancelScheduledMealReminders() {
  const stored = await SecureStore.getItemAsync(IDENTIFIERS_KEY);
  if (!stored) return;
  try {
    const identifiers = JSON.parse(stored) as string[];
    await Promise.all(
      identifiers.map((identifier) =>
        Notifications.cancelScheduledNotificationAsync(identifier),
      ),
    );
  } finally {
    await SecureStore.deleteItemAsync(IDENTIFIERS_KEY);
  }
}

async function ensureNotificationChannel() {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: "Meal reminders",
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

function permissionAllowsNotifications(
  permission: Notifications.NotificationPermissionsStatus,
) {
  return (
    permission.granted ||
    permission.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL
  );
}

async function requestNotificationPermission() {
  await ensureNotificationChannel();
  let permission = await Notifications.getPermissionsAsync();
  if (!permissionAllowsNotifications(permission)) {
    permission = await Notifications.requestPermissionsAsync();
  }
  if (!permissionAllowsNotifications(permission)) {
    throw new Error("NOTIFICATION_PERMISSION_DENIED");
  }
}

async function scheduleEnabledMealReminders(
  preferences: MealReminderPreferences,
) {
  const identifiers: string[] = [];
  for (const meal of MEAL_REMINDERS.filter(
    (candidate) => preferences[candidate.key],
  )) {
    identifiers.push(
      await Notifications.scheduleNotificationAsync({
        content: {
          title: meal.title,
          body: meal.body,
          data: { destination: "explore", meal: meal.key },
          sound: "default",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DAILY,
          hour: meal.hour,
          minute: 0,
          channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
        },
      }),
    );
  }
  await SecureStore.setItemAsync(IDENTIFIERS_KEY, JSON.stringify(identifiers));
}

export async function saveMealReminderPreferences(
  preferences: MealReminderPreferences,
) {
  const enabled = MEAL_REMINDERS.filter((meal) => preferences[meal.key]);
  if (enabled.length > 0) {
    await requestNotificationPermission();
  }

  await cancelScheduledMealReminders();
  await scheduleEnabledMealReminders(preferences);
  await SecureStore.setItemAsync(PREFERENCES_KEY, JSON.stringify(preferences));
}

export async function reconcileMealReminderSchedule() {
  const preferences = await getMealReminderPreferences();
  const enabledCount = MEAL_REMINDERS.filter(
    (meal) => preferences[meal.key],
  ).length;
  if (enabledCount === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permissionAllowsNotifications(permission)) return;

  const stored = await SecureStore.getItemAsync(IDENTIFIERS_KEY);
  const identifiers = stored ? (JSON.parse(stored) as string[]) : [];
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const scheduledIdentifiers = new Set(
    scheduled.map((notification) => notification.identifier),
  );
  const scheduleIsComplete =
    identifiers.length === enabledCount &&
    identifiers.every((identifier) => scheduledIdentifiers.has(identifier));
  if (scheduleIsComplete) return;

  await ensureNotificationChannel();
  await cancelScheduledMealReminders();
  await scheduleEnabledMealReminders(preferences);
}

export async function sendTestMealReminder() {
  await requestNotificationPermission();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Bota reminders are on",
      body: "We'll be here when hunger shows up.",
      data: { destination: "explore", meal: "test" },
      sound: "default",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 5,
      channelId: Platform.OS === "android" ? CHANNEL_ID : undefined,
    },
  });
}
