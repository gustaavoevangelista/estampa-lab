import "server-only";

import { totals } from "@/features/ledger/queries";
import { listProductsWithEconomics } from "@/features/products/queries";
import { getSettings } from "@/features/settings/settings";
import { divRound } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { chartMonths, rangeDates, type DashboardRange } from "./range";

export async function getDashboard(range: DashboardRange, today: Date) {
  const { from, to } = rangeDates(range, today);
  const months = chartMonths(range, today);
  const chartFrom = months[0] < from ? months[0] : from;

  const [txs, products, settings, overdue, upcoming] = await Promise.all([
    prisma.transaction.findMany({
      where: { deletedAt: null, date: { gte: chartFrom, lte: to } },
      select: {
        type: true,
        date: true,
        netCents: true,
        grossCents: true,
        vatCents: true,
        status: true,
        productId: true,
        category: { select: { id: true, name: true, parent: { select: { id: true, name: true } } } },
      },
    }),
    listProductsWithEconomics(),
    getSettings(),
    prisma.transaction.findMany({
      where: { deletedAt: null, status: "PENDING", OR: [{ dueDate: { lt: today } }, { dueDate: null, date: { lt: today } }] },
      include: { supplier: { select: { name: true } }, customer: { select: { name: true } } },
      orderBy: [{ dueDate: "asc" }, { date: "asc" }],
      take: 20,
    }),
    prisma.recurringExpense.findMany({
      where: { active: true, nextRunDate: { gte: today, lte: new Date(today.getTime() + 14 * 86_400_000) } },
      orderBy: { nextRunDate: "asc" },
    }),
  ]);

  const inPeriod = txs.filter((t) => t.date >= from);
  const t = totals(inPeriod);

  // Income vs expenses by month
  const byMonth = months.map((m) => {
    const y = m.getUTCFullYear();
    const mo = m.getUTCMonth();
    const rows = txs.filter((x) => x.date.getUTCFullYear() === y && x.date.getUTCMonth() === mo);
    const income = rows.filter((r) => r.type === "INCOME").reduce((a, r) => a + r.netCents, 0);
    const expenses = rows.filter((r) => r.type === "EXPENSE").reduce((a, r) => a + r.netCents, 0);
    return { month: m.toISOString(), income, expenses, result: income - expenses };
  });

  // Expenses by top-level category
  const catMap = new Map<string, { name: string; cents: number }>();
  for (const r of inPeriod.filter((x) => x.type === "EXPENSE")) {
    const top = r.category.parent ?? r.category;
    const cur = catMap.get(top.id) ?? { name: top.name, cents: 0 };
    cur.cents += r.netCents;
    catMap.set(top.id, cur);
  }
  const expensesByCategory = [...catMap.values()].sort((a, b) => b.cents - a.cents);

  // Products: profit estimated as sales revenue × the product's current margin
  const active = products.filter((p) => p.active);
  const revenueByProduct = new Map<string, number>();
  for (const r of inPeriod.filter((x) => x.type === "INCOME" && x.productId)) {
    revenueByProduct.set(r.productId!, (revenueByProduct.get(r.productId!) ?? 0) + r.netCents);
  }
  const topProducts = active
    .map((p) => {
      const revenue = revenueByProduct.get(p.id) ?? 0;
      return { id: p.id, name: p.name, revenue, marginBp: p.marginBp, profit: p.marginBp === null ? 0 : divRound(revenue * p.marginBp, 10_000) };
    })
    .filter((p) => p.revenue > 0)
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 5);

  const margins = active.filter((p) => p.marginBp !== null).map((p) => p.marginBp!);
  const avgMarginBp = margins.length ? Math.round(margins.reduce((a, b) => a + b, 0) / margins.length) : null;
  const soldRevenue = [...revenueByProduct.values()].reduce((a, b) => a + b, 0);
  const soldProfit = active.reduce((acc, p) => acc + (p.marginBp === null ? 0 : divRound((revenueByProduct.get(p.id) ?? 0) * p.marginBp, 10_000)), 0);
  const weightedMarginBp = soldRevenue ? divRound(soldProfit * 10_000, soldRevenue) : null;

  const marginByProduct = active
    .filter((p) => p.marginBp !== null)
    .map((p) => ({ id: p.id, name: p.name, marginBp: p.marginBp!, low: p.lowMargin }))
    .sort((a, b) => b.marginBp - a.marginBp);

  return {
    from,
    to,
    totals: t,
    byMonth,
    expensesByCategory,
    topProducts,
    avgMarginBp,
    weightedMarginBp,
    marginByProduct,
    marginWarningBp: settings.marginWarningBp,
    lowMarginProducts: active.filter((p) => p.lowMargin || p.lowTier),
    overdue,
    upcoming,
  };
}

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;
