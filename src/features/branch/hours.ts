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
  return openStatus(hours)?.isOpen ?? false;
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

export type OpenStatus = {
  isOpen: boolean;
  /** Open, but closing within the hour — worth a heads-up. */
  closingSoon: boolean;
  /** Open → success; closing or opening within the hour → warning; closed → danger. */
  tone: "success" | "warning" | "danger";
  /** "Open until 7 PM", "Closes in 40 min", "Opens at 7 AM", "Opens Mon 9 AM". */
  label: string;
};

const SOON_MINUTES = 60;
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fromMinutes(total: number): string {
  const m = ((total % 1440) + 1440) % 1440;
  const hh = String(Math.floor(m / 60)).padStart(2, "0");
  const mm = String(m % 60).padStart(2, "0");
  return to12Hour(`${hh}:${mm}`);
}

/**
 * Where a place stands right now (Addis time) and what's next, from its weekly
 * hours. Handles intervals that run past midnight (e.g. 18:00–02:00). Returns
 * null when there are no hours to go on.
 */
export function openStatus(
  hours: BranchHours | null | undefined,
  now: Date = eatNow(),
): OpenStatus | null {
  if (!hours || Object.values(hours).every((d) => !d?.length)) return null;

  const day = now.getDay();
  const current = now.getHours() * 60 + now.getMinutes();

  // Intervals on a timeline where today starts at 0; yesterday's late-night
  // spill-over is negative, the coming week positive.
  const timeline: [number, number][] = [];
  for (let offset = -1; offset <= 7; offset += 1) {
    const key = DAY_KEYS[(((day + offset) % 7) + 7) % 7];
    for (const [open, close] of hours[key] ?? []) {
      const start = offset * 1440 + toMinutes(open);
      let end = offset * 1440 + toMinutes(close);
      if (end <= start) end += 1440; // closes after midnight
      timeline.push([start, end]);
    }
  }

  const openNow = timeline.find(([s, e]) => current >= s && current < e);
  if (openNow) {
    const left = openNow[1] - current;
    return left <= SOON_MINUTES
      ? {
          isOpen: true,
          closingSoon: true,
          tone: "warning",
          label: `Closes in ${left} min`,
        }
      : {
          isOpen: true,
          closingSoon: false,
          tone: "success",
          label: `Open until ${fromMinutes(openNow[1])}`,
        };
  }

  const next = timeline
    .filter(([s]) => s > current)
    .sort((a, b) => a[0] - b[0])[0];
  if (!next) {
    return {
      isOpen: false,
      closingSoon: false,
      tone: "danger",
      label: "Closed",
    };
  }

  const wait = next[0] - current;
  const nextDay = Math.floor(next[0] / 1440);
  const at = fromMinutes(next[0]);
  const label =
    wait <= SOON_MINUTES
      ? `Opens in ${wait} min`
      : nextDay === 0
        ? `Opens at ${at}`
        : nextDay === 1
          ? `Opens tomorrow ${at}`
          : `Opens ${DAY_SHORT[(day + nextDay) % 7]} ${at}`;
  return {
    isOpen: false,
    closingSoon: false,
    tone: wait <= SOON_MINUTES ? "warning" : "danger",
    label,
  };
}

/**
 * The open/closed pill on place cards: the live status from hours when the
 * API sent them, else the server's open-now flag. Null when neither exists.
 */
export function openBadge(branch: {
  hours?: BranchHours | null;
  isOpenNow?: boolean;
}): { label: string; tone: "success" | "warning" | "danger" } | null {
  const status = openStatus(branch.hours);
  if (status) {
    // Cards are narrow: shorten the longest wording ("Opens tomorrow 6 AM").
    return {
      label: status.label.replace(/^Opens tomorrow /, "Opens tmrw "),
      tone: status.tone,
    };
  }
  if (branch.isOpenNow === undefined) return null;
  return branch.isOpenNow
    ? { label: "Open", tone: "success" }
    : { label: "Closed", tone: "danger" };
}
