import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { filtersToQuery, parseLedgerFilters, shiftPeriod } from "@/features/ledger/filters";
import { LedgerFilters } from "@/features/ledger/ledger-filters";
import { getLedgerFormOptions, listTransactions, monthlyBreakdown, totals } from "@/features/ledger/queries";
import { generateDueRecurringEntries } from "@/features/ledger/recurring";
import { TransactionsTable, type LedgerTableRow } from "@/features/ledger/transactions-table";
import { formatDateOnly, formatMonth, todayInLisbon, toISODateOnly } from "@/lib/dates";
import { formatEUR } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Receitas e despesas" };

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-1 px-4">
        <CardDescription>{label}</CardDescription>
        <CardTitle className={cn("text-xl tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</CardTitle>
        {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

export default async function LedgerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireUser();
  const today = todayInLisbon();
  await generateDueRecurringEntries(today);
  const f = parseLedgerFilters(await searchParams, today);
  const [rows, options] = await Promise.all([listTransactions(f), getLedgerFormOptions()]);
  const t = totals(rows);

  const tableRows: LedgerTableRow[] = rows.map((r) => ({
    id: r.id,
    date: r.date.toISOString(),
    type: r.type,
    description: r.description,
    category: r.category.parent ? `${r.category.parent.name} › ${r.category.name}` : r.category.name,
    party: r.supplier?.name ?? r.customer?.name ?? null,
    netCents: r.netCents,
    vatRateBp: r.vatRateBp,
    vatCents: r.vatCents,
    grossCents: r.grossCents,
    status: r.status,
    overdue: r.status === "PENDING" && (r.dueDate ?? r.date) < today,
    dueDate: r.dueDate?.toISOString() ?? null,
    attachments: r._count.attachments,
    recurring: !!r.recurringId,
  }));

  const periodLabel =
    f.view === "year" ? f.period : f.view === "month" ? formatMonth(f.from) : `${formatDateOnly(f.from)} – ${formatDateOnly(f.to)}`;
  const months = f.view === "year" ? monthlyBreakdown(rows, Number(f.period)) : null;

  return (
    <div className="space-y-5">
      <LedgerFilters
        view={f.view}
        period={f.period}
        from={toISODateOnly(f.from)}
        to={toISODateOnly(f.to)}
        categories={options.categories}
        suppliers={options.suppliers}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {f.view !== "custom" && (
            <Button asChild variant="outline" size="icon" aria-label="Período anterior">
              <Link href={`/ledger?${filtersToQuery(f, { period: shiftPeriod(f, -1) })}`} scroll={false}>
                <ChevronLeft />
              </Link>
            </Button>
          )}
          <h2 className="min-w-36 text-center text-lg font-semibold capitalize">{periodLabel}</h2>
          {f.view !== "custom" && (
            <Button asChild variant="outline" size="icon" aria-label="Período seguinte">
              <Link href={`/ledger?${filtersToQuery(f, { period: shiftPeriod(f, 1) })}`} scroll={false}>
                <ChevronRight />
              </Link>
            </Button>
          )}
        </div>
        <Button asChild variant="outline" size="sm">
          <a href={`/api/ledger/export?${filtersToQuery(f)}`} download>
            <Download aria-hidden="true" /> Exportar CSV
          </a>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Receitas (s/ IVA)" value={formatEUR(t.incomeNet)} hint={`c/ IVA ${formatEUR(t.incomeGross)}`} />
        <Kpi label="Despesas (s/ IVA)" value={formatEUR(t.expenseNet)} hint={`c/ IVA ${formatEUR(t.expenseGross)}`} />
        <Kpi label="Resultado (s/ IVA)" value={formatEUR(t.resultNet)} tone={t.resultNet >= 0 ? "good" : "bad"} hint={`${rows.length} ${rows.length === 1 ? "movimento" : "movimentos"} · ${t.pendingCount} ${t.pendingCount === 1 ? "pendente" : "pendentes"}`} />
        <Kpi
          label="IVA liquidado − dedutível"
          value={formatEUR(t.incomeVat - t.expenseVat)}
          hint={`${formatEUR(t.incomeVat)} − ${formatEUR(t.expenseVat)}`}
        />
      </div>

      {months && (
        <div className="rounded-xl border bg-card">
          <Table>
            <caption className="sr-only">Resumo mensal de {f.period}</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Mês</TableHead>
                <TableHead className="text-right">Receitas s/ IVA</TableHead>
                <TableHead className="text-right">Despesas s/ IVA</TableHead>
                <TableHead className="text-right">Resultado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {months.map((m) => (
                <TableRow key={m.month}>
                  <TableCell>
                    <Link className="capitalize text-primary hover:underline" href={`/ledger?${filtersToQuery(f, { view: "month", period: `${f.period}-${String(m.month + 1).padStart(2, "0")}` })}`}>
                      {formatMonth(m.date)}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(m.incomeNet)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(m.expenseNet)}</TableCell>
                  <TableCell className={cn("text-right font-medium tabular-nums", m.resultNet < 0 && "text-destructive")}>{formatEUR(m.resultNet)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
            <TableFooter>
              <TableRow>
                <TableCell>Total</TableCell>
                <TableCell className="text-right tabular-nums">{formatEUR(t.incomeNet)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEUR(t.expenseNet)}</TableCell>
                <TableCell className="text-right tabular-nums">{formatEUR(t.resultNet)}</TableCell>
              </TableRow>
            </TableFooter>
          </Table>
        </div>
      )}

      <TransactionsTable rows={tableRows} />
    </div>
  );
}
