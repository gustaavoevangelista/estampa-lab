/** Date maths for recurring expenses. Dates are UTC-midnight "date-only" values. */
export type Frequency = "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";

export const FREQUENCY_LABELS: Record<Frequency, string> = {
  WEEKLY: "Semanal",
  MONTHLY: "Mensal",
  QUARTERLY: "Trimestral",
  YEARLY: "Anual",
};

/**
 * Next occurrence after `date`. Month-based steps keep the anchor day and clamp to month end
 * (31 Jan → 28/29 Feb → 31 Mar), so a rent due on the 31st never drifts.
 */
export function nextOccurrence(date: Date, frequency: Frequency, interval: number, anchorDay = date.getUTCDate()): Date {
  if (frequency === "WEEKLY") return new Date(date.getTime() + interval * 7 * 86_400_000);
  const months = interval * (frequency === "MONTHLY" ? 1 : frequency === "QUARTERLY" ? 3 : 12);
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const lastDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(anchorDay, lastDay)));
}

/** All occurrence dates from `next` up to and including `until` (and not after `end`). Capped for safety. */
export function dueOccurrences(
  next: Date,
  until: Date,
  frequency: Frequency,
  interval: number,
  anchorDay: number,
  end: Date | null = null,
  max = 120,
): { dates: Date[]; nextAfter: Date } {
  const dates: Date[] = [];
  let d = next;
  while (d <= until && (!end || d <= end) && dates.length < max) {
    dates.push(d);
    d = nextOccurrence(d, frequency, interval, anchorDay);
  }
  return { dates, nextAfter: d };
}
