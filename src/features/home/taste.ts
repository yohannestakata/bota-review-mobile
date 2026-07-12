// Stable-boosts branches whose cuisines match the user's tastes to the top,
// preserving the underlying (e.g. rating) order otherwise. No prefs → unchanged.
export function rankByTaste<T extends { cuisines: { slug: string }[] }>(
  items: T[],
  prefs: string[],
): T[] {
  if (prefs.length === 0) return items;
  const pref = new Set(prefs);
  const matches: T[] = [];
  const rest: T[] = [];
  for (const item of items) {
    if (item.cuisines.some((cuisine) => pref.has(cuisine.slug))) {
      matches.push(item);
    } else {
      rest.push(item);
    }
  }
  return [...matches, ...rest];
}
