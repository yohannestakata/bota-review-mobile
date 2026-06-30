import type { BranchHours } from "./api";

// Places are in Addis Ababa (EAT, UTC+3, no DST), so "now" is evaluated there
// regardless of the device's timezone.
const EAT_OFFSET_MINUTES = 180;
const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export const WEEK: { key: string; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

function eatNow(): Date {
  const now = new Date();
  return new Date(
    now.getTime() + (now.getTimezoneOffset() + EAT_OFFSET_MINUTES) * 60000,
  );
}

function toMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function todayKey(): string {
  return DAY_KEYS[eatNow().getDay()];
}

export function isOpenNow(hours: BranchHours | null): boolean {
  if (!hours) {
    return false;
  }
  const now = eatNow();
  const current = now.getHours() * 60 + now.getMinutes();
  const intervals = hours[DAY_KEYS[now.getDay()]] ?? [];
  return intervals.some(
    ([open, close]) => current >= toMinutes(open) && current < toMinutes(close),
  );
}

// "17:00" -> "5 PM", "09:30" -> "9:30 AM" (minutes dropped when :00).
function to12Hour(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0
    ? `${hour12} ${period}`
    : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

export function formatDayHours(
  intervals: [string, string][] | undefined,
): string {
  if (!intervals || intervals.length === 0) {
    return "Closed";
  }
  return intervals
    .map(([open, close]) => `${to12Hour(open)} – ${to12Hour(close)}`)
    .join(", ");
}
