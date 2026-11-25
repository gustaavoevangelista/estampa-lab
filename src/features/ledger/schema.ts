import { z } from "zod";

import { dateOptional, dateRequired, idOptional, moneyRequiredNonNegative, optionalText, percentRequired, requiredInt, requiredText } from "@/lib/validation";

export const PAYMENT_METHODS = ["BANK_TRANSFER", "MB_WAY", "MULTIBANCO", "CARD", "CASH", "PAYPAL", "OTHER"] as const;
export const PAYMENT_METHOD_LABELS: Record<(typeof PAYMENT_METHODS)[number], string> = {
  BANK_TRANSFER: "Transferência",
  MB_WAY: "MB WAY",
  MULTIBANCO: "Multibanco",
  CARD: "Cartão",
  CASH: "Numerário",
  PAYPAL: "PayPal",
  OTHER: "Outro",
};

const paymentMethod = z
  .string()
  .transform((v) => (v === "" ? null : v))
  .pipe(z.enum(PAYMENT_METHODS).nullable());

export const transactionFormSchema = z
  .object({
    type: z.enum(["INCOME", "EXPENSE"]),
    date: dateRequired,
    dueDate: dateOptional,
    status: z.enum(["PAID", "PENDING"]),
    amountMode: z.enum(["NET", "GROSS"]),
    amount: moneyRequiredNonNegative,
    vatRateBp: percentRequired,
    description: requiredText(200),
    categoryId: z.string().min(1, "Escolha uma categoria."),
    paymentMethod,
    supplierId: idOptional,
    customerName: optionalText(160),
    productId: idOptional,
    invoiceRef: optionalText(80),
    notes: optionalText(5000),
  })
  .superRefine((v, ctx) => {
    if (v.dueDate && v.dueDate < v.date) {
      ctx.addIssue({ code: "custom", path: ["dueDate"], message: "O vencimento não pode ser antes da data." });
    }
  });

export type TransactionFormInput = z.input<typeof transactionFormSchema>;
export type TransactionFormOutput = z.output<typeof transactionFormSchema>;

export const recurringFormSchema = z.object({
  description: requiredText(200),
  netCents: moneyRequiredNonNegative,
  vatRateBp: percentRequired,
  categoryId: z.string().min(1, "Escolha uma categoria."),
  supplierId: idOptional,
  paymentMethod,
  frequency: z.enum(["WEEKLY", "MONTHLY", "QUARTERLY", "YEARLY"]),
  interval: requiredInt(1, 24),
  startDate: dateRequired,
  endDate: dateOptional,
  active: z.boolean(),
});

export type RecurringFormInput = z.input<typeof recurringFormSchema>;

export const categoryFormSchema = z.object({
  name: requiredText(80),
  type: z.enum(["INCOME", "EXPENSE"]),
  parentId: idOptional,
});

export type CategoryFormInput = z.input<typeof categoryFormSchema>;
