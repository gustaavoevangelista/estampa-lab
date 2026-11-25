import type { Metadata } from "next";

import { emptyTransactionForm } from "@/features/ledger/defaults";
import { getLedgerFormOptions } from "@/features/ledger/queries";
import { TransactionForm } from "@/features/ledger/transaction-form";
import { getSettings } from "@/features/settings/settings";
import { todayInLisbon } from "@/lib/dates";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Novo movimento" };

export default async function NewTransactionPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  await requireUser();
  const [{ categories, suppliers, customers, products }, settings, sp] = await Promise.all([getLedgerFormOptions(), getSettings(), searchParams]);
  return (
    <TransactionForm
      defaultValues={emptyTransactionForm(todayInLisbon(), settings.defaultVatRateBp, sp.type === "INCOME" ? "INCOME" : "EXPENSE")}
      categories={categories}
      suppliers={suppliers}
      customers={customers}
      products={products}
    />
  );
}
