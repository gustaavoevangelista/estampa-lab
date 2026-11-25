/** Dates are shown as DD/MM/YYYY in Europe/Lisbon. */
export const APP_TIMEZONE = "Europe/Lisbon";

const dateFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: APP_TIMEZONE,
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const monthFormatter = new Intl.DateTimeFormat("pt-PT", {
  timeZone: "UTC", // month values are UTC-midnight date-only values
  month: "long",
  year: "numeric",
});

/**
 * Formats a full timestamp in Lisbon time.
 * For `@db.Date` columns (stored as UTC midnight) use `formatDateOnly`.
 */
export function formatDate(date: Date): string {
  return dateFormatter.format(date);
}

/** Formats a date-only value (UTC midnight from a DATE column) without shifting the day. */
export function formatDateOnly(date: Date): string {
  const d = String(date.getUTCDate()).padStart(2, "0");
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${d}/${m}/${date.getUTCFullYear()}`;
}

/** "novembro de 2026" style label for a date-only (UTC midnight) value. */
export function formatMonth(date: Date): string {
  return monthFormatter.format(date);
}

/** Parses "DD/MM/YYYY" or "YYYY-MM-DD" into a UTC-midnight Date (for DATE columns). */
export function parseDateOnly(input: string): Date | null {
  const s = input.trim();
  let y: number, m: number, d: number;
  const pt = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(s);
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (pt) [d, m, y] = [Number(pt[1]), Number(pt[2]), Number(pt[3])];
  else if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return date;
}

/** Today's calendar date in Lisbon, as UTC midnight. */
export function todayInLisbon(now: Date = new Date()): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // YYYY-MM-DD
  return parseDateOnly(parts)!;
}

/** Date-only value as YYYY-MM-DD (for <input type="date">). */
export function toISODateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}
