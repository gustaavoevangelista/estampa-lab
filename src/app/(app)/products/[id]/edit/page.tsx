import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/features/products/product-form";
import { getProduct, getProductFormOptions, productToFormInput } from "@/features/products/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Editar produto" };

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [product, { categories, suppliers, settings }] = await Promise.all([getProduct(id), getProductFormOptions()]);
  if (!product) notFound();
  return (
    <>
      <PageHeader title={`Editar ${product.name}`} />
      <ProductForm
        productId={product.id}
        defaultValues={productToFormInput(product)}
        categories={categories}
        suppliers={suppliers.filter((s) => s.active || s.id === product.supplierId)}
        labourRateCents={settings.labourHourlyRateCents}
        marginWarningBp={settings.marginWarningBp}
      />
    </>
  );
}
