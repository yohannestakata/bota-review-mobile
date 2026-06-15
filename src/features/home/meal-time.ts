// Maps the current Addis-Ababa (EAT, UTC+3) hour to a meal-time rail: a title
// and the tag slug to filter by (matches the seeded Breakfast/Lunch/Dinner/
// Late night tags).
function eatHour(): number {
  const now = new Date();
  const eat = new Date(now.getTime() + (now.getTimezoneOffset() + 180) * 60000);
  return eat.getHours();
}

export function mealTimeNow(): { label: string; slug: string } {
  const hour = eatHour();
  if (hour >= 5 && hour < 11) {
    return { label: "Breakfast spots", slug: "breakfast" };
  }
  if (hour >= 11 && hour < 16) {
    return { label: "Lunch spots", slug: "lunch" };
  }
  if (hour >= 16 && hour < 22) {
    return { label: "Dinner tonight", slug: "dinner" };
  }
  return { label: "Late-night bites", slug: "late-night" };
}
