// A pool of greetings per time-of-day bucket (aligned with the backend's meal
// buckets). One is picked per app launch — varied across opens, stable within a
// session (pass a seed pinned at mount). Entries are either a plain string or a
// function that uses the name, so the name is optional.
//
// Note: a meal window is not a clock period — the lunch window starts at 11:00
// (before "afternoon") and the dinner window at 16:00 (before "evening"), so
// these avoid clock-time words that would be wrong at a bucket's edges. Only
// "morning" (5–11) and the late-night phrasings are time-accurate everywhere.

type MealBucket = "breakfast" | "lunch" | "dinner" | "late";
type Greeting = string | ((name: string) => string);

function bucketFor(date: Date): MealBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "late";
}

const GREETINGS: Record<MealBucket, Greeting[]> = {
  breakfast: [
    (n) => `Morning, ${n}. What's for breakfast?`,
    "Rise and shine. Breakfast time?",
    (n) => `Good morning, ${n}. Coffee first?`,
    "Up early? Let's find breakfast.",
    "What's for breakfast this morning?",
    (n) => `Hey ${n}, hungry for breakfast?`,
    "Start the day with something good.",
    "Coffee and a bite to start?",
  ],
  lunch: [
    (n) => `Hey ${n}, what's for lunch today?`,
    "Midday hunger? Let's find lunch.",
    "Lunchtime. What sounds good?",
    (n) => `Craving anything, ${n}?`,
    "Time for a lunch break?",
    (n) => `What's for lunch, ${n}?`,
    "Hungry? Let's grab lunch.",
    "Something good for lunch?",
  ],
  dinner: [
    (n) => `What's for dinner, ${n}?`,
    "Where to for dinner?",
    (n) => `Dinnertime, ${n}. What are you craving?`,
    (n) => `Hey ${n}, what sounds good tonight?`,
    "What's for dinner tonight?",
    "Hungry for dinner?",
    (n) => `Let's find dinner, ${n}.`,
    "Where are we eating tonight?",
  ],
  late: [
    (n) => `Up late, ${n}? Late-night cravings?`,
    "Still hungry? Let's find a spot.",
    "Late-night bites? Let's go.",
    (n) => `Burning the midnight oil, ${n}?`,
    "Craving a late-night snack?",
    "Up late and hungry?",
    (n) => `Hey ${n}, late-night cravings?`,
    "Something to eat this late?",
  ],
};

// `seed` is a number in [0, 1) (e.g. Math.random() captured once at mount).
export function homeGreeting(date: Date, name: string, seed: number): string {
  const pool = GREETINGS[bucketFor(date)];
  const index = Math.min(pool.length - 1, Math.floor(seed * pool.length));
  const entry = pool[index];
  return typeof entry === "function" ? entry(name) : entry;
}
