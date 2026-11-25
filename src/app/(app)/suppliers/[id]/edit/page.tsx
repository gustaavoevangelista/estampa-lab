import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { getSupplier, getSupplierCategories } from "@/features/suppliers/queries";
import type { SupplierFormInput } from "@/features/suppliers/schema";
import { SupplierForm } from "@/features/suppliers/supplier-form";
import { formatAmount } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Editar fornecedor" };

export default async function EditSupplierPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [supplier, categories] = await Promise.all([getSupplier(id), getSupplierCategories()]);
  if (!supplier) notFound();

  const values: SupplierFormInput = {
    name: supplier.name,
    categoryId: supplier.categoryId,
    vatNumber: supplier.vatNumber ?? "",
    contactName: supplier.contactName ?? "",
    email: supplier.email ?? "",
    phone: supplier.phone ?? "",
    addressLine: supplier.addressLine ?? "",
    postalCode: supplier.postalCode ?? "",
    city: supplier.city ?? "",
    country: supplier.country,
    website: supplier.website ?? "",
    paymentTermsDays: supplier.paymentTermsDays?.toString() ?? "",
    leadTimeDays: supplier.leadTimeDays?.toString() ?? "",
    minOrderNetCents: supplier.minOrderNetCents === null ? "" : formatAmount(supplier.minOrderNetCents),
    rating: supplier.rating?.toString() ?? "",
    notes: supplier.notes ?? "",
    active: supplier.active,
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title={`Editar ${supplier.name}`} />
      <SupplierForm supplierId={supplier.id} defaultValues={values} categories={categories} />
    </div>
  );
}
