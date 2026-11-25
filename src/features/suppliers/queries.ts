import "server-only";

import { prisma } from "@/lib/prisma";

export async function getSupplierCategories() {
  return prisma.supplierCategory.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}

/** Gross and net totals spent per supplier (non-deleted expenses). */
export async function getSpendBySupplier(supplierIds?: string[]) {
  const rows = await prisma.transaction.groupBy({
    by: ["supplierId"],
    where: {
      type: "EXPENSE",
      deletedAt: null,
      supplierId: supplierIds ? { in: supplierIds } : { not: null },
    },
    _sum: { grossCents: true, netCents: true },
    _count: true,
  });
  return new Map(
    rows.map((r) => [
      r.supplierId as string,
      { grossCents: r._sum.grossCents ?? 0, netCents: r._sum.netCents ?? 0, count: r._count },
    ]),
  );
}

export async function listSuppliers() {
  const suppliers = await prisma.supplier.findMany({
    where: { deletedAt: null },
    include: { category: true, _count: { select: { products: { where: { deletedAt: null } } } } },
    orderBy: { name: "asc" },
  });
  const spend = await getSpendBySupplier();
  return suppliers.map((s) => ({
    id: s.id,
    name: s.name,
    categoryId: s.categoryId,
    categoryName: s.category.name,
    contactName: s.contactName,
    email: s.email,
    phone: s.phone,
    city: s.city,
    rating: s.rating,
    active: s.active,
    productCount: s._count.products,
    totalSpentGrossCents: spend.get(s.id)?.grossCents ?? 0,
  }));
}

export type SupplierListRow = Awaited<ReturnType<typeof listSuppliers>>[number];

export async function getSupplier(id: string) {
  return prisma.supplier.findFirst({ where: { id, deletedAt: null }, include: { category: true } });
}

export async function getSupplierDetail(id: string) {
  const supplier = await prisma.supplier.findFirst({
    where: { id, deletedAt: null },
    include: {
      category: true,
      products: { where: { deletedAt: null }, include: { category: true }, orderBy: { name: "asc" } },
      prices: { include: { product: { select: { id: true, name: true } } }, orderBy: [{ itemName: "asc" }, { validFrom: "desc" }] },
      transactions: {
        where: { deletedAt: null, type: "EXPENSE" },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 20,
      },
    },
  });
  if (!supplier) return null;
  const spend = (await getSpendBySupplier([id])).get(id) ?? { grossCents: 0, netCents: 0, count: 0 };
  return { ...supplier, spend };
}

export async function getProductOptions() {
  return prisma.product.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, sku: true },
    orderBy: { name: "asc" },
  });
}
