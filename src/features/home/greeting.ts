// A small pool of greetings per time-of-day bucket (aligned with the backend's
// meal buckets). One is picked per app launch — varied across opens, stable
// within a session (pass a seed pinned at mount).

type MealBucket = "breakfast" | "lunch" | "dinner" | "late";

function bucketFor(date: Date): MealBucket {
  const hour = date.getHours();
  if (hour >= 5 && hour < 11) return "breakfast";
  if (hour >= 11 && hour < 16) return "lunch";
  if (hour >= 16 && hour < 22) return "dinner";
  return "late";
}

// Kept ~2 lines at text-3xl so the header height stays consistent.
const GREETINGS: Record<MealBucket, ((name: string) => string)[]> = {
  breakfast: [
    (n) => `Morning, ${n} — what's for breakfast?`,
    (n) => `Rise and shine, ${n}. Breakfast time?`,
    (n) => `Good morning, ${n}. Coffee first?`,
    (n) => `Up early, ${n}? Let's find breakfast.`,
  ],
  lunch: [
    (n) => `Hey ${n}, what's for lunch today?`,
    (n) => `Midday hunger, ${n}? Let's find lunch.`,
    (n) => `Lunchtime, ${n} — what sounds good?`,
    (n) => `Afternoon, ${n}. Craving anything?`,
  ],
  dinner: [
    (n) => `Good evening, ${n}. What's for dinner?`,
    (n) => `Evening, ${n} — where to for dinner?`,
    (n) => `Dinnertime, ${n}. What are you craving?`,
    (n) => `Hey ${n}, what sounds good tonight?`,
  ],
  late: [
    (n) => `Up late, ${n}? Late-night cravings?`,
    (n) => `Still hungry, ${n}? Let's find a spot.`,
    (n) => `Late-night bites, ${n}? Let's go.`,
    (n) => `Burning the midnight oil, ${n}?`,
  ],
};

// `seed` is a number in [0, 1) (e.g. Math.random() captured once at mount).
export function homeGreeting(date: Date, name: string, seed: number): string {
  const pool = GREETINGS[bucketFor(date)];
  const index = Math.min(pool.length - 1, Math.floor(seed * pool.length));
  return pool[index](name);
}
