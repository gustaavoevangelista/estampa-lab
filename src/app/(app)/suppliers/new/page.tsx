import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { getSupplierCategories } from "@/features/suppliers/queries";
import { emptySupplierForm } from "@/features/suppliers/schema";
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage() {
  await requireUser();
  const categories = await getSupplierCategories();
  return (
    <div className="max-w-4xl">
      <PageHeader title="Novo fornecedor" />
      <SupplierForm defaultValues={emptySupplierForm} categories={categories} />
    </div>
  );
}
