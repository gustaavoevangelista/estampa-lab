import { z } from "zod";

import {
  idOptional,
  moneyOptional,
  moneyRequiredNonNegative,
  optionalInt,
  optionalText,
  percentOptional,
  percentRequired,
  requiredInt,
  requiredText,
} from "@/lib/validation";
import { validateTiers } from "./costing";

export const COST_ITEM_TYPES = ["BLANK", "PRINT", "CONSUMABLES", "PACKAGING", "LABOUR", "SHIPPING_IN", "OTHER"] as const;
export const PRINT_TECHNIQUES = ["DTF", "VINYL", "SUBLIMATION", "EMBROIDERY", "SCREEN_PRINT", "UV", "LASER", "OTHER"] as const;

const variantSchema = z.object({
  id: idOptional,
  sku: requiredText(60),
  size: optionalText(30),
  colour: optionalText(40),
  salePriceNetCents: moneyOptional,
  extraCostNetCents: moneyOptional.transform((v) => v ?? 0),
  active: z.boolean(),
});

const costItemSchema = z
  .object({
    type: z.enum(COST_ITEM_TYPES),
    label: requiredText(120),
    technique: z
      .string()
      .transform((v) => (v === "" ? null : v))
      .pipe(z.enum(PRINT_TECHNIQUES).nullable()),
    supplierId: idOptional,
    unitCostNetCents: moneyOptional,
    labourMinutes: optionalInt(0, 10_000),
    hourlyRateCents: moneyOptional,
  })
  .superRefine((v, ctx) => {
    if (v.type === "LABOUR") {
      if (v.labourMinutes === null) ctx.addIssue({ code: "custom", path: ["labourMinutes"], message: "Indique os minutos." });
    } else if (v.unitCostNetCents === null) {
      ctx.addIssue({ code: "custom", path: ["unitCostNetCents"], message: "Indique o custo." });
    }
  })
  .transform((v) => ({
    ...v,
    technique: v.type === "PRINT" ? v.technique : null,
    unitCostNetCents: v.type === "LABOUR" ? null : v.unitCostNetCents,
    labourMinutes: v.type === "LABOUR" ? v.labourMinutes : null,
    hourlyRateCents: v.type === "LABOUR" ? v.hourlyRateCents : null,
  }));

const fixedCostSchema = z.object({
  label: requiredText(120),
  amountNetCents: moneyRequiredNonNegative,
});

const tierSchema = z.object({
  minQty: requiredInt(1, 1_000_000),
  maxQty: optionalInt(1, 1_000_000),
  unitPriceNetCents: moneyRequiredNonNegative,
});

export const productFormSchema = z
  .object({
    name: requiredText(160),
    sku: requiredText(60),
    categoryId: z.string().min(1, "Escolha uma categoria."),
    supplierId: idOptional,
    description: optionalText(5000),
    baseSalePriceNetCents: moneyRequiredNonNegative,
    vatRateBp: percentRequired,
    marginWarningBp: percentOptional,
    active: z.boolean(),
    variants: z.array(variantSchema),
    costItems: z.array(costItemSchema),
    fixedCosts: z.array(fixedCostSchema),
    priceTiers: z.array(tierSchema),
  })
  .superRefine((v, ctx) => {
    const tierError = validateTiers(v.priceTiers);
    if (tierError) ctx.addIssue({ code: "custom", path: ["priceTiers"], message: tierError });
    const skus = new Set<string>([v.sku.toUpperCase()]);
    v.variants.forEach((variant, i) => {
      const key = variant.sku.toUpperCase();
      if (skus.has(key)) ctx.addIssue({ code: "custom", path: ["variants", i, "sku"], message: "SKU repetido." });
      skus.add(key);
    });
  });

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;

export const emptyCostItem: ProductFormInput["costItems"][number] = {
  type: "BLANK",
  label: "",
  technique: "",
  supplierId: "",
  unitCostNetCents: "",
  labourMinutes: "",
  hourlyRateCents: "",
};

export const emptyVariant: ProductFormInput["variants"][number] = {
  id: "",
  sku: "",
  size: "",
  colour: "",
  salePriceNetCents: "",
  extraCostNetCents: "",
  active: true,
};

export function emptyProductForm(defaultVatBp: number): ProductFormInput {
  return {
    name: "",
    sku: "",
    categoryId: "",
    supplierId: "",
    description: "",
    baseSalePriceNetCents: "",
    vatRateBp: (defaultVatBp / 100).toString().replace(".", ","),
    marginWarningBp: "",
    active: true,
    variants: [],
    costItems: [
      { ...emptyCostItem, type: "BLANK", label: "Peça lisa" },
      { ...emptyCostItem, type: "PRINT", label: "Personalização", technique: "DTF" },
      { ...emptyCostItem, type: "PACKAGING", label: "Embalagem" },
      { ...emptyCostItem, type: "LABOUR", label: "Mão de obra", labourMinutes: "5" },
    ],
    fixedCosts: [],
    priceTiers: [],
  };
}
