import "server-only";

import type { Prisma } from "@prisma/client";

import { getSettings, type AppSettings } from "@/features/settings/settings";
import { formatAmount, bpToInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { economics, tierEconomics, unitCostCents } from "./costing";
import type { ProductFormInput } from "./schema";

const productInclude = {
  category: true,
  supplier: { select: { id: true, name: true } },
  variants: { orderBy: { sku: "asc" } },
  costItems: { orderBy: { sortOrder: "asc" }, include: { supplier: { select: { id: true, name: true } } } },
  fixedCosts: true,
  priceTiers: { orderBy: { minQty: "asc" } },
} satisfies Prisma.ProductInclude;

export type ProductWithRelations = Prisma.ProductGetPayload<{ include: typeof productInclude }>;

/** Unit cost, price, margin, markup, break-even and tiers for one product. */
export function productEconomics(p: ProductWithRelations, settings: AppSettings) {
  const unitCost = unitCostCents(p.costItems, settings.labourHourlyRateCents);
  const fixedCostsCents = p.fixedCosts.reduce((acc, f) => acc + f.amountNetCents, 0);
  const marginWarningBp = p.marginWarningBp ?? settings.marginWarningBp;
  const base = economics({
    priceNetCents: p.baseSalePriceNetCents,
    vatRateBp: p.vatRateBp,
    unitCostCents: unitCost,
    fixedCostsCents,
    marginWarningBp,
  });
  const tiers = tierEconomics(p.priceTiers, { unitCostCents: unitCost, vatRateBp: p.vatRateBp, fixedCostsCents, marginWarningBp });
  return { ...base, fixedCostsCents, marginWarningBp, tiers, anyTierLow: tiers.some((t) => t.lowMargin) };
}

export async function listProductsWithEconomics() {
  const [products, settings] = await Promise.all([
    prisma.product.findMany({ where: { deletedAt: null }, include: productInclude, orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  return products.map((p) => {
    const e = productEconomics(p, settings);
    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
      categoryName: p.category.name,
      supplierName: p.supplier?.name ?? null,
      active: p.active,
      variantCount: p.variants.length,
      unitCostCents: e.unitCostCents,
      priceNetCents: e.priceNetCents,
      priceGrossCents: e.priceGrossCents,
      grossMarginCents: e.grossMarginCents,
      marginBp: e.marginBp,
      markupBp: e.markupBp,
      breakEvenQty: e.breakEvenQty,
      lowMargin: e.lowMargin,
      lowTier: !e.lowMargin && e.anyTierLow,
    };
  });
}

export type ProductListRow = Awaited<ReturnType<typeof listProductsWithEconomics>>[number];

export async function getProduct(id: string) {
  return prisma.product.findFirst({ where: { id, deletedAt: null }, include: productInclude });
}

export async function getProductFormOptions() {
  const [categories, suppliers, settings] = await Promise.all([
    prisma.productCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true } }),
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, active: true } }),
    getSettings(),
  ]);
  return { categories, suppliers, settings };
}

const money = (c: number | null) => (c === null ? "" : formatAmount(c));

export function productToFormInput(p: ProductWithRelations): ProductFormInput {
  return {
    name: p.name,
    sku: p.sku,
    categoryId: p.categoryId,
    supplierId: p.supplierId ?? "",
    description: p.description ?? "",
    baseSalePriceNetCents: money(p.baseSalePriceNetCents),
    vatRateBp: bpToInput(p.vatRateBp),
    marginWarningBp: p.marginWarningBp === null ? "" : bpToInput(p.marginWarningBp),
    active: p.active,
    variants: p.variants.map((v) => ({
      id: v.id,
      sku: v.sku,
      size: v.size ?? "",
      colour: v.colour ?? "",
      salePriceNetCents: money(v.salePriceNetCents),
      extraCostNetCents: v.extraCostNetCents ? money(v.extraCostNetCents) : "",
      active: v.active,
    })),
    costItems: p.costItems.map((c) => ({
      type: c.type,
      label: c.label,
      technique: c.technique ?? "",
      supplierId: c.supplierId ?? "",
      unitCostNetCents: money(c.unitCostNetCents),
      labourMinutes: c.labourMinutes?.toString() ?? "",
      hourlyRateCents: money(c.hourlyRateCents),
    })),
    fixedCosts: p.fixedCosts.map((f) => ({ label: f.label, amountNetCents: money(f.amountNetCents) })),
    priceTiers: p.priceTiers.map((t) => ({
      minQty: t.minQty.toString(),
      maxQty: t.maxQty?.toString() ?? "",
      unitPriceNetCents: money(t.unitPriceNetCents),
    })),
  };
}
