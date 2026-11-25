import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, CircleAlert, TrendingDown, TriangleAlert } from "lucide-react";

import { EmptyState } from "@/components/layout/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpensesByCategoryChart, IncomeExpensesChart, MarginByProductChart } from "@/features/dashboard/charts";
import { getDashboard } from "@/features/dashboard/queries";
import { parseRange, RANGE_LABELS, type DashboardRange } from "@/features/dashboard/range";
import { generateDueRecurringEntries } from "@/features/ledger/recurring";
import { formatDateOnly, todayInLisbon } from "@/lib/dates";
import { formatEUR, formatPercent } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";
import { LayoutDashboard } from "lucide-react";

export const metadata: Metadata = { title: "Painel" };

function Kpi({ label, value, hint, tone }: { label: string; value: string; hint?: string; tone?: "good" | "bad" }) {
  return (
    <Card className="gap-1 py-4">
      <CardHeader className="gap-1 px-4">
        <CardDescription>{label}</CardDescription>
        <p className={cn("text-2xl font-semibold tracking-tight tabular-nums", tone === "good" && "text-success", tone === "bad" && "text-destructive")}>{value}</p>
        {hint && <p className="text-xs text-muted-foreground tabular-nums">{hint}</p>}
      </CardHeader>
    </Card>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ range?: string }> }) {
  const user = await requireUser();
  const today = todayInLisbon();
  await generateDueRecurringEntries(today);
  const range = parseRange((await searchParams).range);
  const d = await getDashboard(range, today);
  const t = d.totals;
  const empty = d.byMonth.every((m) => m.income === 0 && m.expenses === 0) && d.marginByProduct.length === 0;
  const receivables = d.overdue.filter((o) => o.type === "INCOME");
  const payables = d.overdue.filter((o) => o.type === "EXPENSE");

  return (
    <>
      <PageHeader
        title={`Olá, ${user.name?.split(" ")[0] ?? ""}`}
        description={`Resumo de ${formatDateOnly(d.from)} a ${formatDateOnly(d.to)} · valores sem IVA`}
        actions={
          <nav aria-label="Período" className="inline-flex flex-wrap rounded-lg border bg-muted p-1">
            {(Object.keys(RANGE_LABELS) as DashboardRange[]).map((r) => (
              <Link
                key={r}
                href={r === "month" ? "/" : `/?range=${r}`}
                aria-current={r === range ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                  r === range ? "bg-card shadow-xs" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {RANGE_LABELS[r]}
              </Link>
            ))}
          </nav>
        }
      />

      {empty ? (
        <EmptyState
          icon={LayoutDashboard}
          title="O painel ainda está vazio"
          description="Os indicadores aparecem aqui depois de criar produtos e registar movimentos. Para ver dados de exemplo, corra npm run db:seed."
        />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Kpi label="Receitas" value={formatEUR(t.incomeNet)} hint={`c/ IVA ${formatEUR(t.incomeGross)}`} />
            <Kpi label="Despesas" value={formatEUR(t.expenseNet)} hint={`c/ IVA ${formatEUR(t.expenseGross)}`} />
            <Kpi label="Lucro (resultado)" value={formatEUR(t.resultNet)} tone={t.resultNet >= 0 ? "good" : "bad"} hint="Receitas − despesas, sem IVA" />
            <Kpi
              label="Margem média"
              value={formatPercent(d.weightedMarginBp ?? d.avgMarginBp)}
              hint={d.weightedMarginBp !== null ? `ponderada pelas vendas · catálogo ${formatPercent(d.avgMarginBp)}` : "média do catálogo"}
            />
          </div>

          {(receivables.length > 0 || payables.length > 0 || d.lowMarginProducts.length > 0 || d.upcoming.length > 0) && (
            <section aria-labelledby="alerts-title">
              <h2 id="alerts-title" className="sr-only">
                Alertas
              </h2>
              <div className="grid gap-4 lg:grid-cols-3">
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CircleAlert className="size-4 text-destructive" aria-hidden="true" /> Pagamentos em atraso
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    {d.overdue.length === 0 && <p className="text-muted-foreground">Nada em atraso.</p>}
                    {d.overdue.slice(0, 6).map((o) => (
                      <Link key={o.id} href={`/ledger/${o.id}`} className="flex items-start justify-between gap-2 rounded-md p-1 hover:bg-muted">
                        <span className="min-w-0">
                          <span className="block truncate font-medium">{o.customer?.name ?? o.supplier?.name ?? o.description}</span>
                          <span className="text-xs text-muted-foreground">
                            {o.type === "INCOME" ? "A receber" : "A pagar"} · venceu {formatDateOnly(o.dueDate ?? o.date)}
                          </span>
                        </span>
                        <span className={cn("shrink-0 tabular-nums", o.type === "EXPENSE" && "text-destructive")}>{formatEUR(o.grossCents)}</span>
                      </Link>
                    ))}
                    {d.overdue.length > 0 && (
                      <p className="border-t pt-2 text-xs text-muted-foreground">
                        A receber {formatEUR(receivables.reduce((a, o) => a + o.grossCents, 0))} · a pagar{" "}
                        {formatEUR(payables.reduce((a, o) => a + o.grossCents, 0))}
                        {" · "}
                        <Link className="text-primary underline" href="/ledger?view=year&status=PENDING">
                          ver pendentes
                        </Link>
                      </p>
                    )}
                  </CardContent>
                </Card>
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <TriangleAlert className="size-4 text-warning" aria-hidden="true" /> Margem baixa
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {d.lowMarginProducts.length === 0 && <p className="text-muted-foreground">Todos os produtos acima do limite.</p>}
                    {d.lowMarginProducts.slice(0, 6).map((p) => (
                      <Link key={p.id} href={`/products/${p.id}`} className="flex items-center justify-between gap-2 rounded-md p-1 hover:bg-muted">
                        <span className="truncate">{p.name}</span>
                        {p.lowMargin ? (
                          <Badge variant="destructive">{formatPercent(p.marginBp)}</Badge>
                        ) : (
                          <Badge variant="warning">escalão</Badge>
                        )}
                      </Link>
                    ))}
                    <p className="border-t pt-2 text-xs text-muted-foreground">Limite: {formatPercent(d.marginWarningBp)} (Definições)</p>
                  </CardContent>
                </Card>
                <Card className="gap-3">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <CalendarClock className="size-4 text-primary" aria-hidden="true" /> Despesas recorrentes (14 dias)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    {d.upcoming.length === 0 && <p className="text-muted-foreground">Nada nos próximos 14 dias.</p>}
                    {d.upcoming.map((r) => (
                      <div key={r.id} className="flex items-center justify-between gap-2 p-1">
                        <span className="min-w-0">
                          <span className="block truncate">{r.description}</span>
                          <span className="text-xs text-muted-foreground">{formatDateOnly(r.nextRunDate)}</span>
                        </span>
                        <span className="shrink-0 tabular-nums">{formatEUR(r.netCents)}</span>
                      </div>
                    ))}
                    <p className="border-t pt-2 text-xs">
                      <Link className="text-primary underline" href="/ledger/recurring">
                        Gerir recorrentes
                      </Link>
                    </p>
                  </CardContent>
                </Card>
              </div>
            </section>
          )}

          <div className="grid gap-6 xl:grid-cols-3 [&>*]:min-w-0">
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Receitas vs despesas por mês</CardTitle>
                <CardDescription>Sem IVA</CardDescription>
              </CardHeader>
              <CardContent>
                <IncomeExpensesChart data={d.byMonth} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top produtos por lucro</CardTitle>
                <CardDescription>Lucro estimado = vendas × margem atual do produto</CardDescription>
              </CardHeader>
              <CardContent>
                {d.topProducts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sem vendas ligadas a produtos neste período.</p>
                ) : (
                  <ol className="space-y-3 text-sm">
                    {d.topProducts.map((p, i) => (
                      <li key={p.id} className="flex items-start gap-3">
                        <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold">{i + 1}</span>
                        <span className="min-w-0 flex-1">
                          <Link href={`/products/${p.id}`} className="block truncate font-medium text-primary hover:underline">
                            {p.name}
                          </Link>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            vendas {formatEUR(p.revenue)} · margem {formatPercent(p.marginBp)}
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold tabular-nums">{formatEUR(p.profit)}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Despesas por categoria</CardTitle>
                <CardDescription>Sem IVA, no período</CardDescription>
              </CardHeader>
              <CardContent>
                {d.expensesByCategory.length === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <TrendingDown className="size-4" aria-hidden="true" /> Sem despesas no período.
                  </p>
                ) : (
                  <ExpensesByCategoryChart data={d.expensesByCategory} />
                )}
              </CardContent>
            </Card>
            <Card className="xl:col-span-2">
              <CardHeader>
                <CardTitle>Margem por produto</CardTitle>
                <CardDescription>Preço base, produtos ativos</CardDescription>
              </CardHeader>
              <CardContent>
                <MarginByProductChart data={d.marginByProduct} thresholdBp={d.marginWarningBp} />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
}
