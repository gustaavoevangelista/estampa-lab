import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { transactionToForm } from "@/features/ledger/defaults";
import { getLedgerFormOptions, getTransaction } from "@/features/ledger/queries";
import { TransactionForm } from "@/features/ledger/transaction-form";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Editar movimento" };

export default async function EditTransactionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [t, { categories, suppliers, customers, products }] = await Promise.all([getTransaction(id), getLedgerFormOptions()]);
  if (!t) notFound();
  return (
    <TransactionForm
      transactionId={t.id}
      defaultValues={transactionToForm(t)}
      categories={categories}
      suppliers={suppliers}
      customers={customers}
      products={products}
    />
  );
}
