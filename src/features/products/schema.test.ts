import { describe, expect, it } from "vitest";

import { emptyProductForm, productFormSchema } from "./schema";

const base = () => ({
  ...emptyProductForm(2300),
  name: "T-shirt personalizada",
  sku: "TS-001",
  categoryId: "cat",
  baseSalePriceNetCents: "12,00",
});

describe("productFormSchema", () => {
  it("requires cost or minutes depending on line type", () => {
    const r = productFormSchema.safeParse(base());
    expect(r.success).toBe(false);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("costItems.0.unitCostNetCents");
    expect(paths).not.toContain("costItems.3.labourMinutes");
  });

  it("parses a full product and clears fields that don't apply", () => {
    const input = base();
    input.costItems = input.costItems.map((c) => ({ ...c, unitCostNetCents: "1,50", hourlyRateCents: "20" }));
    input.priceTiers = [
      { minQty: "1", maxQty: "9", unitPriceNetCents: "12" },
      { minQty: "10", maxQty: "", unitPriceNetCents: "10,50" },
    ];
    const out = productFormSchema.parse(input);
    expect(out.baseSalePriceNetCents).toBe(1200);
    expect(out.vatRateBp).toBe(2300);
    expect(out.costItems[0]).toMatchObject({ unitCostNetCents: 150, technique: null, hourlyRateCents: null });
    expect(out.costItems[3]).toMatchObject({ type: "LABOUR", unitCostNetCents: null, labourMinutes: 5, hourlyRateCents: 2000 });
    expect(out.priceTiers[1]).toEqual({ minQty: 10, maxQty: null, unitPriceNetCents: 1050 });
  });

  it("rejects overlapping tiers and duplicate SKUs", () => {
    const input = base();
    input.costItems = [];
    input.priceTiers = [
      { minQty: "1", maxQty: "10", unitPriceNetCents: "12" },
      { minQty: "10", maxQty: "", unitPriceNetCents: "10" },
    ];
    input.variants = [{ id: "", sku: "ts-001", size: "M", colour: "", salePriceNetCents: "", extraCostNetCents: "", active: true }];
    const r = productFormSchema.safeParse(input);
    const paths = r.error!.issues.map((i) => i.path.join("."));
    expect(paths).toContain("priceTiers");
    expect(paths).toContain("variants.0.sku");
  });
});
