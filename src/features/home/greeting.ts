// Home greeting = a clock-accurate salutation (Morning/Afternoon/Evening, or
// none late at night) + a meal-accurate question, combined. The two are derived
// independently so each stays correct: at 11:58 the clock is "Morning" but the
// meal is lunch -> "Morning, Yohannes. What's for lunch?".
//
// One greeting is picked per app launch (pass a seed pinned at mount): varied
// across opens, stable within a session.

type MealBucket = "breakfast" | "lunch" | "dinner" | "late";

// Clock brackets. Returns null late at night, where a salutation ("Night"/
// "Good night") reads as a farewell — the late questions stand on their own.
function salutationFor(hour: number): string | null {
  if (hour >= 5 && hour < 12) return "Morning";
  if (hour >= 12 && hour < 17) return "Afternoon";
  if (hour >= 17 && hour < 21) return "Evening";
  return null;
}

// Meal windows (aligned with the backend's meal buckets).
function mealFor(hour: number): MealBucket {
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "late";
}

// Meal-specific questions — no clock words (the salutation owns the time).
const QUESTIONS: Record<MealBucket, string[]> = {
  breakfast: [
    "What's for breakfast?",
    "Hungry for breakfast?",
    "Coffee first?",
    "Let's find breakfast.",
    "What sounds good?",
    "Time for a bite?",
    "Breakfast on your mind?",
    "Let's start the day right.",
  ],
  lunch: [
    "What's for lunch?",
    "Hungry for lunch?",
    "What sounds good?",
    "Time for a lunch break?",
    "Let's grab lunch.",
    "Craving anything?",
    "Something good for lunch?",
    "Where to for lunch?",
  ],
  dinner: [
    "What's for dinner?",
    "Hungry for dinner?",
    "What sounds good tonight?",
    "Where to for dinner?",
    "Let's find dinner.",
    "What are you craving?",
    "Where are we eating tonight?",
    "Dinner plans?",
  ],
  late: [
    "Late-night cravings?",
    "Still hungry?",
    "Late-night bites?",
    "Craving a snack?",
    "Something to eat this late?",
    "Up late and hungry?",
    "Let's find a late-night spot.",
    "Midnight snack?",
  ],
};

// `seed` is a number in [0, 1) (e.g. Math.random() captured once at mount).
export function homeGreeting(date: Date, name: string, seed: number): string {
  const hour = date.getHours();
  const pool = QUESTIONS[mealFor(hour)];
  const question =
    pool[Math.min(pool.length - 1, Math.floor(seed * pool.length))];
  const salutation = salutationFor(hour);

  // A few forms — sometimes a salutation, sometimes a name, sometimes just the
  // question. So we don't greet the same way (or at all) every time.
  const forms = salutation
    ? [
        `${salutation}, ${name}. ${question}`,
        `${salutation}. ${question}`,
        `Hey ${name}. ${question}`,
        question,
      ]
    : [`Hey ${name}. ${question}`, question];

  return forms[Math.floor(seed * 1000) % forms.length];
}
