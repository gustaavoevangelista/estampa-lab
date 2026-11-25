/**
 * Shared money maths for EstampaLab.
 *
 * - Amounts are integer euro cents (`Cents`). Never floats.
 * - Rates (VAT, margin, markup) are integer basis points (`Bp`): 2300 = 23,00 %.
 * - All rounding is "half away from zero" on exact integer arithmetic.
 */

export type Cents = number;
export type Bp = number;

export const BP_SCALE = 10_000;
export const DEFAULT_VAT_BP: Bp = 2300;

export class MoneyError extends Error {}

function assertInt(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`${name} must be a safe integer, got ${value}`);
  }
}

function assertVatBp(bp: Bp): void {
  assertInt(bp, "vatRateBp");
  if (bp < 0 || bp > BP_SCALE) throw new MoneyError(`VAT rate out of range: ${bp}`);
}

/** Integer division rounding half away from zero. */
export function divRound(numerator: number, denominator: number): number {
  assertInt(numerator, "numerator");
  assertInt(denominator, "denominator");
  if (denominator === 0) throw new MoneyError("Division by zero");
  const sign = Math.sign(numerator) * Math.sign(denominator);
  const n = Math.abs(numerator);
  const d = Math.abs(denominator);
  const q = Math.floor(n / d);
  const r = n - q * d;
  const rounded = 2 * r >= d ? q + 1 : q;
  return sign < 0 ? -rounded : rounded;
}

/** Integer division rounding up (towards +∞). */
export function divCeil(numerator: number, denominator: number): number {
  assertInt(numerator, "numerator");
  assertInt(denominator, "denominator");
  if (denominator === 0) throw new MoneyError("Division by zero");
  const q = Math.floor(numerator / denominator);
  return q * denominator === numerator ? q : q + 1;
}

export function sumCents(values: readonly Cents[]): Cents {
  return values.reduce((acc, v) => {
    assertInt(v, "amount");
    return acc + v;
  }, 0);
}

// ─────────────── VAT ───────────────

export interface VatBreakdown {
  netCents: Cents;
  vatCents: Cents;
  grossCents: Cents;
}

export function vatFromNet(netCents: Cents, vatRateBp: Bp): Cents {
  assertInt(netCents, "netCents");
  assertVatBp(vatRateBp);
  return divRound(netCents * vatRateBp, BP_SCALE);
}

export function fromNet(netCents: Cents, vatRateBp: Bp): VatBreakdown {
  const vatCents = vatFromNet(netCents, vatRateBp);
  return { netCents, vatCents, grossCents: netCents + vatCents };
}

/** Splits a gross (VAT-inclusive) amount. net + vat always equals gross exactly. */
export function fromGross(grossCents: Cents, vatRateBp: Bp): VatBreakdown {
  assertInt(grossCents, "grossCents");
  assertVatBp(vatRateBp);
  const netCents = divRound(grossCents * BP_SCALE, BP_SCALE + vatRateBp);
  return { netCents, vatCents: grossCents - netCents, grossCents };
}

export const netToGross = (netCents: Cents, vatRateBp: Bp): Cents => fromNet(netCents, vatRateBp).grossCents;
export const grossToNet = (grossCents: Cents, vatRateBp: Bp): Cents => fromGross(grossCents, vatRateBp).netCents;

// ─────────────── Margin & pricing ───────────────

export interface MarginResult {
  /** Sale price minus unit cost, both net of VAT. */
  grossMarginCents: Cents;
  /** Margin over sale price. null when the price is zero. */
  marginBp: Bp | null;
  /** Margin over cost. null when the cost is zero. */
  markupBp: Bp | null;
}

export function margin(priceNetCents: Cents, unitCostNetCents: Cents): MarginResult {
  assertInt(priceNetCents, "priceNetCents");
  assertInt(unitCostNetCents, "unitCostNetCents");
  const grossMarginCents = priceNetCents - unitCostNetCents;
  return {
    grossMarginCents,
    marginBp: priceNetCents === 0 ? null : divRound(grossMarginCents * BP_SCALE, priceNetCents),
    markupBp: unitCostNetCents === 0 ? null : divRound(grossMarginCents * BP_SCALE, unitCostNetCents),
  };
}

/**
 * Smallest net price (in whole cents) whose margin is at least `targetMarginBp`.
 * Returns null for targets of 100 % or more (impossible).
 */
export function priceForTargetMargin(unitCostNetCents: Cents, targetMarginBp: Bp): Cents | null {
  assertInt(unitCostNetCents, "unitCostNetCents");
  assertInt(targetMarginBp, "targetMarginBp");
  if (targetMarginBp >= BP_SCALE) return null;
  return divCeil(unitCostNetCents * BP_SCALE, BP_SCALE - targetMarginBp);
}

/**
 * Units needed so contribution covers fixed/setup costs.
 * 0 when there are no fixed costs; null when each unit loses money (never breaks even).
 */
export function breakEvenQuantity(
  fixedCostsNetCents: Cents,
  priceNetCents: Cents,
  unitCostNetCents: Cents,
): number | null {
  assertInt(fixedCostsNetCents, "fixedCostsNetCents");
  const contribution = priceNetCents - unitCostNetCents;
  if (fixedCostsNetCents <= 0) return 0;
  if (contribution <= 0) return null;
  return divCeil(fixedCostsNetCents, contribution);
}

/** Labour cost for `minutes` at an hourly rate in cents. */
export function labourCost(minutes: number, hourlyRateCents: Cents): Cents {
  assertInt(minutes, "minutes");
  assertInt(hourlyRateCents, "hourlyRateCents");
  return divRound(minutes * hourlyRateCents, 60);
}

// ─────────────── Formatting & parsing (pt-PT) ───────────────

const eurFormatter = new Intl.NumberFormat("pt-PT", {
  style: "currency",
  currency: "EUR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

const numberFormatter = new Intl.NumberFormat("pt-PT", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: "always",
});

/** 123456 → "1 234,56 €" (pt-PT, non-breaking spaces). */
export function formatEUR(cents: Cents): string {
  assertInt(cents, "cents");
  return eurFormatter.format(cents / 100);
}

/** 123456 → "1 234,56" (no currency symbol, for inputs). */
export function formatAmount(cents: Cents): string {
  assertInt(cents, "cents");
  return numberFormatter.format(cents / 100);
}

/** 2350 → "23,5 %". null → "—". */
export function formatPercent(bp: Bp | null, fractionDigits = 1): string {
  if (bp === null) return "—";
  assertInt(bp, "bp");
  // Built manually so the output doesn't depend on the ICU version ("23 %" vs "23%").
  const n = new Intl.NumberFormat("pt-PT", {
    minimumFractionDigits: 0,
    maximumFractionDigits: fractionDigits,
    useGrouping: "always",
  }).format(bp / 100);
  return `${n}\u00a0%`;
}

/**
 * Parses user input into cents. Accepts "1 234,56", "1234,5", "1.234,56", "1234.56", "12 €", "-3,20".
 * Returns null for empty or invalid input, or more than 2 decimals.
 */
export function parseEUR(input: string): Cents | null {
  let s = input.replace(/[\s  €]/g, "");
  if (s === "") return null;
  let negative = false;
  if (s.startsWith("-")) {
    negative = true;
    s = s.slice(1);
  }
  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");
  const isGrouped = (groups: string[]) =>
    /^\d{1,3}$/.test(groups[0]) && groups.slice(1).every((g) => /^\d{3}$/.test(g));
  let intPart: string;
  let fracPart = "";
  if (lastComma >= 0 && lastDot >= 0) {
    // Both present: the last one is the decimal separator, the other is grouping.
    const decIdx = Math.max(lastComma, lastDot);
    const groupChar = decIdx === lastComma ? "." : ",";
    const groups = s.slice(0, decIdx).split(groupChar);
    if (groups.some((g) => /[.,]/.test(g)) || (groups.length > 1 && !isGrouped(groups))) return null;
    intPart = groups.join("");
    fracPart = s.slice(decIdx + 1);
  } else if (lastComma >= 0 || lastDot >= 0) {
    const sep = lastComma >= 0 ? "," : ".";
    const parts = s.split(sep);
    if (parts.length > 2) {
      // "1.234.567" → grouping only
      if (!isGrouped(parts)) return null;
      intPart = parts.join("");
    } else if (sep === "." && parts[1].length === 3 && parts[0].length > 0) {
      // "1.234" in pt-PT is a thousands group
      intPart = parts.join("");
    } else {
      intPart = parts[0];
      fracPart = parts[1];
    }
  } else {
    intPart = s;
  }
  if (intPart === "") intPart = "0";
  if (!/^\d+$/.test(intPart) || !/^\d{0,2}$/.test(fracPart)) return null;
  const cents = Number(intPart) * 100 + Number(fracPart.padEnd(2, "0") || "0");
  if (!Number.isSafeInteger(cents)) return null;
  return negative ? -cents : cents;
}

/** "23" → 2300, "6,5" → 650. Returns null for invalid input or out of 0–100. */
export function parsePercentToBp(input: string): Bp | null {
  const s = input.replace(/[\s%]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [i, f = ""] = s.split(".");
  const bp = Number(i) * 100 + Number(f.padEnd(2, "0"));
  return bp > BP_SCALE ? null : bp;
}

/** 2350 → "23,5" (for prefilling percentage inputs). */
export function bpToInput(bp: Bp): string {
  assertInt(bp, "bp");
  return (bp / 100).toString().replace(".", ",");
}
