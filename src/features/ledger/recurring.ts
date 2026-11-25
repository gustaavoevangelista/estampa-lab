import "server-only";

import { todayInLisbon } from "@/lib/dates";
import { fromNet } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { dueOccurrences } from "./recurrence";

/**
 * Creates ledger entries for every recurring expense that is due up to today.
 * Called when the ledger or dashboard loads: no cron needed. Idempotent thanks to
 * the unique (recurringId, date) index.
 */
export async function generateDueRecurringEntries(today = todayInLisbon()): Promise<number> {
  const rules = await prisma.recurringExpense.findMany({ where: { active: true, nextRunDate: { lte: today } } });
  let created = 0;
  for (const r of rules) {
    const { dates, nextAfter } = dueOccurrences(r.nextRunDate, today, r.frequency, r.interval, r.startDate.getUTCDate(), r.endDate);
    const amounts = fromNet(r.netCents, r.vatRateBp);
    await prisma.$transaction([
      prisma.transaction.createMany({
        skipDuplicates: true,
        data: dates.map((date) => ({
          type: "EXPENSE" as const,
          date,
          status: "PAID" as const,
          paidAt: date,
          netCents: amounts.netCents,
          vatRateBp: r.vatRateBp,
          vatCents: amounts.vatCents,
          grossCents: amounts.grossCents,
          description: r.description,
          categoryId: r.categoryId,
          supplierId: r.supplierId,
          paymentMethod: r.paymentMethod,
          recurringId: r.id,
        })),
      }),
      prisma.recurringExpense.update({
        where: { id: r.id },
        data: { nextRunDate: nextAfter, active: r.endDate ? nextAfter <= r.endDate : true },
      }),
    ]);
    created += dates.length;
  }
  return created;
}
