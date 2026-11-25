import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { ProductForm } from "@/features/products/product-form";
import { getProductFormOptions } from "@/features/products/queries";
import { emptyProductForm } from "@/features/products/schema";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Novo produto" };

export default async function NewProductPage() {
  await requireUser();
  const { categories, suppliers, settings } = await getProductFormOptions();
  return (
    <>
      <PageHeader title="Novo produto" />
      <ProductForm
        defaultValues={emptyProductForm(settings.defaultVatRateBp)}
        categories={categories}
        suppliers={suppliers.filter((s) => s.active)}
        labourRateCents={settings.labourHourlyRateCents}
        marginWarningBp={settings.marginWarningBp}
      />
    </>
  );
}
