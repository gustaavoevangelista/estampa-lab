/** Ledger filters live in the URL so views can be bookmarked and exported. */
import { parseDateOnly, toISODateOnly } from "@/lib/dates";

export type LedgerView = "month" | "year" | "custom";

export interface LedgerFilters {
  view: LedgerView;
  /** "2026-11" for month view, "2026" for year view. */
  period: string;
  from: Date;
  /** Inclusive. */
  to: Date;
  type: "INCOME" | "EXPENSE" | null;
  categoryId: string | null;
  supplierId: string | null;
  status: "PAID" | "PENDING" | null;
  q: string | null;
}

type Params = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || null;

export function parseLedgerFilters(params: Params, today: Date): LedgerFilters {
  const viewParam = one(params.view);
  const view: LedgerView = viewParam === "year" || viewParam === "custom" ? viewParam : "month";
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth();
  let period = one(params.period) ?? "";
  let from: Date;
  let to: Date;

  if (view === "year") {
    const year = /^\d{4}$/.test(period) ? Number(period) : y;
    period = String(year);
    from = new Date(Date.UTC(year, 0, 1));
    to = new Date(Date.UTC(year, 11, 31));
  } else if (view === "custom") {
    from = parseDateOnly(one(params.from) ?? "") ?? new Date(Date.UTC(y, m, 1));
    to = parseDateOnly(one(params.to) ?? "") ?? today;
    if (to < from) [from, to] = [to, from];
    period = "";
  } else {
    const match = /^(\d{4})-(\d{2})$/.exec(period);
    const [py, pm] = match && Number(match[2]) >= 1 && Number(match[2]) <= 12 ? [Number(match[1]), Number(match[2]) - 1] : [y, m];
    period = `${py}-${String(pm + 1).padStart(2, "0")}`;
    from = new Date(Date.UTC(py, pm, 1));
    to = new Date(Date.UTC(py, pm + 1, 0));
  }

  const type = one(params.type);
  const status = one(params.status);
  return {
    view,
    period,
    from,
    to,
    type: type === "INCOME" || type === "EXPENSE" ? type : null,
    categoryId: one(params.categoryId),
    supplierId: one(params.supplierId),
    status: status === "PAID" || status === "PENDING" ? status : null,
    q: one(params.q),
  };
}

/** Serialises filters back to a query string (for links, CSV export). */
export function filtersToQuery(f: LedgerFilters, overrides: Partial<Record<string, string | null>> = {}): string {
  const p = new URLSearchParams();
  const base: Record<string, string | null> = {
    view: f.view,
    period: f.view === "custom" ? null : f.period,
    from: f.view === "custom" ? toISODateOnly(f.from) : null,
    to: f.view === "custom" ? toISODateOnly(f.to) : null,
    type: f.type,
    categoryId: f.categoryId,
    supplierId: f.supplierId,
    status: f.status,
    q: f.q,
    ...overrides,
  };
  for (const [k, v] of Object.entries(base)) if (v) p.set(k, v);
  return p.toString();
}

/** Previous / next period for month and year views. */
export function shiftPeriod(f: LedgerFilters, delta: number): string {
  if (f.view === "year") return String(Number(f.period) + delta);
  const [y, m] = f.period.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}
