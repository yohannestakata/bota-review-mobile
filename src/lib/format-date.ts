// Natural-language recency ("just now", "5m ago", "3d ago", "2w ago") with an
// absolute fallback for anything older than ~a month. Dependency-free — Hermes'
// Intl is unreliable in RN, so we avoid Intl.RelativeTimeFormat / date-fns.
//
// Use for activity timestamps (reviews, replies, claims). NOT for chosen
// calendar dates like a profile join date or a review's visit date.
export function formatRelativeDate(iso: string): string {
  const date = new Date(iso);
  const seconds = Math.max(0, (Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleDateString(
    undefined,
    sameYear
      ? { month: "short", day: "numeric" }
      : { month: "short", year: "numeric" },
  );
}
