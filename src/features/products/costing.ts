/**
 * Product costing maths (pure, shared by server pages and the live form preview).
 * All amounts are net of VAT, in cents.
 */
import {
  breakEvenQuantity,
  fromNet,
  labourCost,
  margin,
  priceForTargetMargin,
  sumCents,
  type Bp,
  type Cents,
} from "@/lib/money";

export type CostItemType = "BLANK" | "PRINT" | "CONSUMABLES" | "PACKAGING" | "LABOUR" | "SHIPPING_IN" | "OTHER";

export const COST_ITEM_LABELS: Record<CostItemType, string> = {
  BLANK: "Peça lisa",
  PRINT: "Personalização",
  CONSUMABLES: "Tinta / consumíveis",
  PACKAGING: "Embalagem",
  LABOUR: "Mão de obra",
  SHIPPING_IN: "Portes de compra (quota)",
  OTHER: "Outro",
};

export type PrintTechnique = "DTF" | "VINYL" | "SUBLIMATION" | "EMBROIDERY" | "SCREEN_PRINT" | "UV" | "LASER" | "OTHER";

export const TECHNIQUE_LABELS: Record<PrintTechnique, string> = {
  DTF: "DTF",
  VINYL: "Vinil",
  SUBLIMATION: "Sublimação",
  EMBROIDERY: "Bordado",
  SCREEN_PRINT: "Serigrafia",
  UV: "Impressão UV",
  LASER: "Gravação laser",
  OTHER: "Outra",
};

export interface CostLineInput {
  type: CostItemType;
  unitCostNetCents: Cents | null;
  labourMinutes: number | null;
  hourlyRateCents: Cents | null;
}

/** Cost of one line for one unit. Labour = minutes × rate (line rate or the global default). */
export function costLineCents(line: CostLineInput, defaultHourlyRateCents: Cents): Cents {
  if (line.type === "LABOUR") {
    return labourCost(line.labourMinutes ?? 0, line.hourlyRateCents ?? defaultHourlyRateCents);
  }
  return line.unitCostNetCents ?? 0;
}

export function unitCostCents(lines: CostLineInput[], defaultHourlyRateCents: Cents, variantExtraCents = 0): Cents {
  return sumCents(lines.map((l) => costLineCents(l, defaultHourlyRateCents))) + variantExtraCents;
}

export interface Economics {
  unitCostCents: Cents;
  priceNetCents: Cents;
  priceGrossCents: Cents;
  vatCents: Cents;
  grossMarginCents: Cents;
  marginBp: Bp | null;
  markupBp: Bp | null;
  breakEvenQty: number | null;
  lowMargin: boolean;
}

export function economics(args: {
  priceNetCents: Cents;
  vatRateBp: Bp;
  unitCostCents: Cents;
  fixedCostsCents: Cents;
  marginWarningBp: Bp;
}): Economics {
  const vat = fromNet(args.priceNetCents, args.vatRateBp);
  const m = margin(args.priceNetCents, args.unitCostCents);
  return {
    unitCostCents: args.unitCostCents,
    priceNetCents: args.priceNetCents,
    priceGrossCents: vat.grossCents,
    vatCents: vat.vatCents,
    ...m,
    breakEvenQty: breakEvenQuantity(args.fixedCostsCents, args.priceNetCents, args.unitCostCents),
    lowMargin: m.marginBp === null || m.marginBp < args.marginWarningBp,
  };
}

export interface TierInput {
  minQty: number;
  maxQty: number | null;
  unitPriceNetCents: Cents;
}

export interface TierEconomics extends TierInput {
  priceGrossCents: Cents;
  grossMarginCents: Cents;
  marginBp: Bp | null;
  markupBp: Bp | null;
  /** Margin per unit at the tier's minimum quantity once fixed costs are spread over it. */
  marginAtMinQtyWithFixedBp: Bp | null;
  lowMargin: boolean;
}

export function tierEconomics(
  tiers: TierInput[],
  args: { unitCostCents: Cents; vatRateBp: Bp; fixedCostsCents: Cents; marginWarningBp: Bp },
): TierEconomics[] {
  return [...tiers]
    .sort((a, b) => a.minQty - b.minQty)
    .map((t) => {
      const m = margin(t.unitPriceNetCents, args.unitCostCents);
      const qty = Math.max(1, t.minQty);
      const revenue = t.unitPriceNetCents * qty;
      const withFixed = margin(revenue, args.unitCostCents * qty + args.fixedCostsCents);
      return {
        ...t,
        priceGrossCents: fromNet(t.unitPriceNetCents, args.vatRateBp).grossCents,
        ...m,
        marginAtMinQtyWithFixedBp: withFixed.marginBp,
        lowMargin: m.marginBp === null || m.marginBp < args.marginWarningBp,
      };
    });
}

/** Suggested net price for a target margin, plus the gross price and resulting markup. */
export function whatIf(unitCost: Cents, targetMarginBp: Bp, vatRateBp: Bp) {
  const priceNetCents = priceForTargetMargin(unitCost, targetMarginBp);
  if (priceNetCents === null) return null;
  const m = margin(priceNetCents, unitCost);
  return { priceNetCents, priceGrossCents: fromNet(priceNetCents, vatRateBp).grossCents, ...m };
}

/** Returns the error message (pt-PT) for overlapping / badly ordered tiers, or null. */
export function validateTiers(tiers: TierInput[]): string | null {
  const sorted = [...tiers].sort((a, b) => a.minQty - b.minQty);
  for (let i = 0; i < sorted.length; i++) {
    const t = sorted[i];
    if (t.maxQty !== null && t.maxQty < t.minQty) return `O escalão ${t.minQty}+ tem máximo inferior ao mínimo.`;
    const next = sorted[i + 1];
    if (next) {
      if (t.maxQty === null) return `O escalão ${t.minQty}+ não tem máximo mas existe outro a seguir.`;
      if (next.minQty <= t.maxQty) return `Os escalões ${t.minQty}–${t.maxQty} e ${next.minQty}+ sobrepõem-se.`;
    }
  }
  return null;
}
