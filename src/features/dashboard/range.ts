/** Dashboard period presets. Dates are UTC-midnight date-only values. */
export type DashboardRange = "month" | "3m" | "ytd" | "12m";

export const RANGE_LABELS: Record<DashboardRange, string> = {
  month: "Este mês",
  "3m": "Últimos 3 meses",
  ytd: "Este ano",
  "12m": "Últimos 12 meses",
};

export function parseRange(v: string | undefined): DashboardRange {
  return v === "3m" || v === "ytd" || v === "12m" ? v : "month";
}

export function rangeDates(range: DashboardRange, today: Date): { from: Date; to: Date } {
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  const from =
    range === "month"
      ? new Date(Date.UTC(y, m, 1))
      : range === "3m"
        ? new Date(Date.UTC(y, m - 2, 1))
        : range === "ytd"
          ? new Date(Date.UTC(y, 0, 1))
          : new Date(Date.UTC(y, m - 11, 1));
  return { from, to: today };
}

/** Months shown in the income-vs-expenses chart: the range, but at least the last 6 months. */
export function chartMonths(range: DashboardRange, today: Date): Date[] {
  const { from } = rangeDates(range, today);
  const sixAgo = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const start = from < sixAgo ? from : sixAgo;
  const out: Date[] = [];
  for (let d = start; d <= today; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) out.push(d);
  return out;
}
