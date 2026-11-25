import { describe, expect, it } from "vitest";

import { costLineCents, economics, tierEconomics, unitCostCents, validateTiers, whatIf } from "./costing";

const lines = [
  { type: "BLANK" as const, unitCostNetCents: 199, labourMinutes: null, hourlyRateCents: null },
  { type: "PRINT" as const, unitCostNetCents: 150, labourMinutes: null, hourlyRateCents: null },
  { type: "PACKAGING" as const, unitCostNetCents: 18, labourMinutes: null, hourlyRateCents: null },
  { type: "LABOUR" as const, unitCostNetCents: null, labourMinutes: 6, hourlyRateCents: null },
];

describe("unit cost", () => {
  it("uses the default hourly rate for labour lines", () => {
    expect(costLineCents(lines[3], 1500)).toBe(150);
    expect(costLineCents({ ...lines[3], hourlyRateCents: 2000 }, 1500)).toBe(200);
  });
  it("sums lines and variant extra cost", () => {
    expect(unitCostCents(lines, 1500)).toBe(517);
    expect(unitCostCents(lines, 1500, 50)).toBe(567);
    expect(unitCostCents([], 1500)).toBe(0);
  });
});

describe("economics", () => {
  it("computes price, margin, markup and break-even", () => {
    const e = economics({ priceNetCents: 1200, vatRateBp: 2300, unitCostCents: 517, fixedCostsCents: 3000, marginWarningBp: 3000 });
    expect(e.priceGrossCents).toBe(1476);
    expect(e.grossMarginCents).toBe(683);
    expect(e.marginBp).toBe(5692);
    expect(e.markupBp).toBe(13211);
    expect(e.breakEvenQty).toBe(5); // 30 € / 6,83 € → 4,39 → 5
    expect(e.lowMargin).toBe(false);
  });
  it("flags low and undefined margins", () => {
    expect(economics({ priceNetCents: 600, vatRateBp: 2300, unitCostCents: 517, fixedCostsCents: 0, marginWarningBp: 3000 }).lowMargin).toBe(true);
    expect(economics({ priceNetCents: 0, vatRateBp: 2300, unitCostCents: 517, fixedCostsCents: 0, marginWarningBp: 3000 }).lowMargin).toBe(true);
  });
});

describe("tiers", () => {
  it("recomputes margin per tier, sorted, including fixed costs at min qty", () => {
    const t = tierEconomics(
      [
        { minQty: 50, maxQty: null, unitPriceNetCents: 800 },
        { minQty: 1, maxQty: 9, unitPriceNetCents: 1200 },
      ],
      { unitCostCents: 500, vatRateBp: 2300, fixedCostsCents: 3000, marginWarningBp: 3000 },
    );
    expect(t.map((x) => x.minQty)).toEqual([1, 50]);
    expect(t[0].marginBp).toBe(5833);
    expect(t[0].marginAtMinQtyWithFixedBp).toBe(-19167); // 1 unit can't absorb 30 € setup
    expect(t[1].marginBp).toBe(3750);
    expect(t[1].marginAtMinQtyWithFixedBp).toBe(3000); // (40000-25000-3000)/40000
  });
  it("validates overlaps and open-ended tiers", () => {
    expect(validateTiers([{ minQty: 1, maxQty: 9, unitPriceNetCents: 1 }, { minQty: 10, maxQty: null, unitPriceNetCents: 1 }])).toBeNull();
    expect(validateTiers([{ minQty: 1, maxQty: 10, unitPriceNetCents: 1 }, { minQty: 10, maxQty: null, unitPriceNetCents: 1 }])).toMatch(/sobrepõem/);
    expect(validateTiers([{ minQty: 1, maxQty: null, unitPriceNetCents: 1 }, { minQty: 10, maxQty: null, unitPriceNetCents: 1 }])).toMatch(/não tem máximo/);
    expect(validateTiers([{ minQty: 10, maxQty: 5, unitPriceNetCents: 1 }])).toMatch(/inferior/);
  });
});

describe("what-if", () => {
  it("suggests the price for a target margin", () => {
    const r = whatIf(517, 4000, 2300)!;
    expect(r.priceNetCents).toBe(862);
    expect(r.marginBp).toBeGreaterThanOrEqual(4000);
    expect(r.priceGrossCents).toBe(1060);
  });
  it("returns null for impossible targets", () => {
    expect(whatIf(517, 10000, 2300)).toBeNull();
  });
});
