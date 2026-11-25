import type { Metadata } from "next";
import Link from "next/link";
import { Package, Plus } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ProductsTable } from "@/features/products/products-table";
import { getProductFormOptions, listProductsWithEconomics } from "@/features/products/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Produtos e custos" };

export default async function ProductsPage() {
  await requireUser();
  const [products, { categories }] = await Promise.all([listProductsWithEconomics(), getProductFormOptions()]);
  const newButton = (
    <Button asChild>
      <Link href="/products/new">
        <Plus aria-hidden="true" /> Novo produto
      </Link>
    </Button>
  );
  return (
    <>
      <PageHeader title="Produtos e custos" description="Catálogo, custo unitário, preço e margem de cada produto." actions={newButton} />
      {products.length === 0 ? (
        <EmptyState icon={Package} title="Ainda não há produtos" description="Crie um produto para calcular custos e margens." action={newButton} />
      ) : (
        <ProductsTable products={products} categories={categories} />
      )}
    </>
  );
}
