import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Truck } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { getSupplierCategories, listSuppliers } from "@/features/suppliers/queries";
import { SuppliersTable } from "@/features/suppliers/suppliers-table";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Fornecedores" };

export default async function SuppliersPage() {
  await requireUser();
  const [suppliers, categories] = await Promise.all([listSuppliers(), getSupplierCategories()]);

  const newButton = (
    <Button asChild>
      <Link href="/suppliers/new">
        <Plus aria-hidden="true" />
        Novo fornecedor
      </Link>
    </Button>
  );

  return (
    <>
      <PageHeader title="Fornecedores" description="Fornecedores de peças, tintas, embalagem e serviços." actions={newButton} />
      {suppliers.length === 0 ? (
        <EmptyState
          icon={Truck}
          title="Ainda não há fornecedores"
          description="Registe o primeiro fornecedor para ligar produtos e despesas."
          action={newButton}
        />
      ) : (
        <SuppliersTable suppliers={suppliers} categories={categories.map(({ id, name }) => ({ id, name }))} />
      )}
    </>
  );
}
