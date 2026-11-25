import { z } from "zod";

import {
  dateRequired,
  idOptional,
  isValidPortugueseNif,
  moneyOptional,
  moneyRequiredNonNegative,
  optionalEmail,
  optionalInt,
  optionalText,
  optionalUrl,
  optionalVatNumber,
  requiredText,
} from "@/lib/validation";

export const supplierFormSchema = z
  .object({
    name: requiredText(120),
    categoryId: z.string().min(1, "Escolha uma categoria."),
    vatNumber: optionalVatNumber,
    contactName: optionalText(120),
    email: optionalEmail,
    phone: optionalText(40),
    addressLine: optionalText(200),
    postalCode: optionalText(20),
    city: optionalText(80),
    country: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Use o código do país com 2 letras (ex.: PT)."),
    website: optionalUrl,
    paymentTermsDays: optionalInt(0, 365),
    leadTimeDays: optionalInt(0, 365),
    minOrderNetCents: moneyOptional,
    rating: z
      .string()
      .transform((v) => (v === "" ? null : Number(v)))
      .refine((v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 5), "Avaliação de 1 a 5."),
    notes: optionalText(5000),
    active: z.boolean(),
  })
  .superRefine((v, ctx) => {
    if (v.country === "PT" && v.vatNumber && !isValidPortugueseNif(v.vatNumber)) {
      ctx.addIssue({ code: "custom", path: ["vatNumber"], message: "NIF inválido (verifique os 9 dígitos)." });
    }
    if (v.country === "PT" && v.postalCode && !/^\d{4}-\d{3}$/.test(v.postalCode)) {
      ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Código postal no formato 1234-567." });
    }
  });

export type SupplierFormInput = z.input<typeof supplierFormSchema>;
export type SupplierFormOutput = z.output<typeof supplierFormSchema>;

export const emptySupplierForm: SupplierFormInput = {
  name: "",
  categoryId: "",
  vatNumber: "",
  contactName: "",
  email: "",
  phone: "",
  addressLine: "",
  postalCode: "",
  city: "",
  country: "PT",
  website: "",
  paymentTermsDays: "",
  leadTimeDays: "",
  minOrderNetCents: "",
  rating: "",
  notes: "",
  active: true,
};

export const supplierPriceFormSchema = z.object({
  supplierId: z.string().min(1),
  itemName: requiredText(160),
  productId: idOptional,
  unitCostNetCents: moneyRequiredNonNegative,
  validFrom: dateRequired,
  notes: optionalText(500),
});

export type SupplierPriceFormInput = z.input<typeof supplierPriceFormSchema>;
