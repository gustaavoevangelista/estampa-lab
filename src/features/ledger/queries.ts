import "server-only";

import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import type { LedgerFilters } from "./filters";

export async function getCategoryTree() {
  const cats = await prisma.transactionCategory.findMany({ orderBy: [{ type: "asc" }, { sortOrder: "asc" }, { name: "asc" }] });
  const top = cats.filter((c) => !c.parentId);
  return top.map((c) => ({ ...c, children: cats.filter((x) => x.parentId === c.id) }));
}

export type CategoryNode = Awaited<ReturnType<typeof getCategoryTree>>[number];

/** Flat list for <select>, children shown under their parent. */
export function categoryOptions(tree: CategoryNode[], type?: "INCOME" | "EXPENSE") {
  return tree
    .filter((c) => !type || c.type === type)
    .flatMap((c) => [
      { id: c.id, label: c.name, type: c.type, depth: 0 },
      ...c.children.map((ch) => ({ id: ch.id, label: ch.name, type: ch.type, depth: 1, parentName: c.name })),
    ]);
}

export async function ledgerWhere(f: LedgerFilters): Promise<Prisma.TransactionWhereInput> {
  let categoryIds: string[] | undefined;
  if (f.categoryId) {
    const children = await prisma.transactionCategory.findMany({ where: { parentId: f.categoryId }, select: { id: true } });
    categoryIds = [f.categoryId, ...children.map((c) => c.id)];
  }
  return {
    deletedAt: null,
    date: { gte: f.from, lte: f.to },
    ...(f.type && { type: f.type }),
    ...(f.status && { status: f.status }),
    ...(f.supplierId && { supplierId: f.supplierId }),
    ...(categoryIds && { categoryId: { in: categoryIds } }),
    ...(f.q && {
      OR: [
        { description: { contains: f.q, mode: "insensitive" } },
        { notes: { contains: f.q, mode: "insensitive" } },
        { invoiceRef: { contains: f.q, mode: "insensitive" } },
        { supplier: { name: { contains: f.q, mode: "insensitive" } } },
        { customer: { name: { contains: f.q, mode: "insensitive" } } },
      ],
    }),
  };
}

export const ledgerInclude = {
  category: { include: { parent: true } },
  supplier: { select: { id: true, name: true } },
  customer: { select: { id: true, name: true } },
  product: { select: { id: true, name: true } },
  _count: { select: { attachments: true } },
} satisfies Prisma.TransactionInclude;

export async function listTransactions(f: LedgerFilters) {
  return prisma.transaction.findMany({
    where: await ledgerWhere(f),
    include: ledgerInclude,
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 5000,
  });
}

export type LedgerRow = Awaited<ReturnType<typeof listTransactions>>[number];

export interface LedgerTotals {
  incomeNet: number;
  incomeGross: number;
  incomeVat: number;
  expenseNet: number;
  expenseGross: number;
  expenseVat: number;
  resultNet: number;
  pendingCount: number;
}

export function totals(rows: Pick<LedgerRow, "type" | "netCents" | "grossCents" | "vatCents" | "status">[]): LedgerTotals {
  const t: LedgerTotals = { incomeNet: 0, incomeGross: 0, incomeVat: 0, expenseNet: 0, expenseGross: 0, expenseVat: 0, resultNet: 0, pendingCount: 0 };
  for (const r of rows) {
    if (r.type === "INCOME") {
      t.incomeNet += r.netCents;
      t.incomeGross += r.grossCents;
      t.incomeVat += r.vatCents;
    } else {
      t.expenseNet += r.netCents;
      t.expenseGross += r.grossCents;
      t.expenseVat += r.vatCents;
    }
    if (r.status === "PENDING") t.pendingCount++;
  }
  t.resultNet = t.incomeNet - t.expenseNet;
  return t;
}

/** 12 rows (one per month) for the year view. */
export function monthlyBreakdown(rows: Pick<LedgerRow, "type" | "netCents" | "date">[], year: number) {
  const months = Array.from({ length: 12 }, (_, i) => ({ month: i, date: new Date(Date.UTC(year, i, 1)), incomeNet: 0, expenseNet: 0, resultNet: 0 }));
  for (const r of rows) {
    if (r.date.getUTCFullYear() !== year) continue;
    const m = months[r.date.getUTCMonth()];
    if (r.type === "INCOME") m.incomeNet += r.netCents;
    else m.expenseNet += r.netCents;
  }
  for (const m of months) m.resultNet = m.incomeNet - m.expenseNet;
  return months;
}

export async function getTransaction(id: string) {
  return prisma.transaction.findFirst({
    where: { id, deletedAt: null },
    include: { ...ledgerInclude, attachments: { orderBy: { createdAt: "asc" } }, recurring: { select: { id: true, description: true } } },
  });
}

export async function getLedgerFormOptions() {
  const [tree, suppliers, customers, products] = await Promise.all([
    getCategoryTree(),
    prisma.supplier.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.customer.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    prisma.product.findMany({ where: { deletedAt: null }, orderBy: { name: "asc" }, select: { id: true, name: true, sku: true } }),
  ]);
  return { categories: categoryOptions(tree), tree, suppliers, customers, products };
}

export async function listRecurring() {
  return prisma.recurringExpense.findMany({
    include: { category: true, supplier: { select: { id: true, name: true } }, _count: { select: { transactions: true } } },
    orderBy: [{ active: "desc" }, { nextRunDate: "asc" }],
  });
}
