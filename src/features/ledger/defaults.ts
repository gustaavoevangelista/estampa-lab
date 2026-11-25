import { formatAmount, bpToInput } from "@/lib/money";
import { toISODateOnly } from "@/lib/dates";
import type { TransactionFormInput } from "./schema";

export function emptyTransactionForm(today: Date, vatBp: number, type: "INCOME" | "EXPENSE" = "EXPENSE"): TransactionFormInput {
  return {
    type,
    date: toISODateOnly(today),
    dueDate: "",
    status: "PAID",
    amountMode: "GROSS",
    amount: "",
    vatRateBp: bpToInput(vatBp),
    description: "",
    categoryId: "",
    paymentMethod: "",
    supplierId: "",
    customerName: "",
    productId: "",
    invoiceRef: "",
    notes: "",
  };
}

export function transactionToForm(t: {
  type: "INCOME" | "EXPENSE";
  date: Date;
  dueDate: Date | null;
  status: "PAID" | "PENDING";
  grossCents: number;
  vatRateBp: number;
  description: string;
  categoryId: string;
  paymentMethod: string | null;
  supplierId: string | null;
  customer: { name: string } | null;
  productId: string | null;
  invoiceRef: string | null;
  notes: string | null;
}): TransactionFormInput {
  return {
    type: t.type,
    date: toISODateOnly(t.date),
    dueDate: t.dueDate ? toISODateOnly(t.dueDate) : "",
    status: t.status,
    amountMode: "GROSS",
    amount: formatAmount(t.grossCents),
    vatRateBp: bpToInput(t.vatRateBp),
    description: t.description,
    categoryId: t.categoryId,
    paymentMethod: t.paymentMethod ?? "",
    supplierId: t.supplierId ?? "",
    customerName: t.customer?.name ?? "",
    productId: t.productId ?? "",
    invoiceRef: t.invoiceRef ?? "",
    notes: t.notes ?? "",
  };
}
