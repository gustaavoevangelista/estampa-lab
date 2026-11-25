import type { Metadata } from "next";
import Link from "next/link";
import { Pencil } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteRecurring } from "@/features/ledger/actions";
import { categoryOptions, getLedgerFormOptions, listRecurring } from "@/features/ledger/queries";
import { FREQUENCY_LABELS } from "@/features/ledger/recurrence";
import { generateDueRecurringEntries } from "@/features/ledger/recurring";
import { RecurringForm } from "@/features/ledger/recurring-form";
import type { RecurringFormInput } from "@/features/ledger/schema";
import { getSettings } from "@/features/settings/settings";
import { formatDateOnly, todayInLisbon, toISODateOnly } from "@/lib/dates";
import { bpToInput, formatAmount, formatEUR, fromNet } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Despesas recorrentes" };

export default async function RecurringPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  await requireUser();
  await generateDueRecurringEntries();
  const [rules, options, settings, sp] = await Promise.all([listRecurring(), getLedgerFormOptions(), getSettings(), searchParams]);
  const editing = sp.edit ? rules.find((r) => r.id === sp.edit) : undefined;
  const values: RecurringFormInput = editing
    ? {
        description: editing.description,
        netCents: formatAmount(editing.netCents),
        vatRateBp: bpToInput(editing.vatRateBp),
        categoryId: editing.categoryId,
        supplierId: editing.supplierId ?? "",
        paymentMethod: editing.paymentMethod ?? "",
        frequency: editing.frequency,
        interval: String(editing.interval),
        startDate: toISODateOnly(editing.startDate),
        endDate: editing.endDate ? toISODateOnly(editing.endDate) : "",
        active: editing.active,
      }
    : {
        description: "",
        netCents: "",
        vatRateBp: bpToInput(settings.defaultVatRateBp),
        categoryId: "",
        supplierId: "",
        paymentMethod: "",
        frequency: "MONTHLY",
        interval: "1",
        startDate: toISODateOnly(todayInLisbon()),
        endDate: "",
        active: true,
      };
  const monthlyTotal = rules
    .filter((r) => r.active)
    .reduce((acc, r) => {
      const gross = fromNet(r.netCents, r.vatRateBp).grossCents;
      const perMonth = { WEEKLY: (gross * 52) / 12, MONTHLY: gross, QUARTERLY: gross / 3, YEARLY: gross / 12 }[r.frequency] / r.interval;
      return acc + perMonth;
    }, 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{editing ? `Editar: ${editing.description}` : "Nova despesa recorrente"}</CardTitle>
          <CardDescription>
            Os movimentos são criados automaticamente (como pagos) quando a data chega. Ao abrir a app, as datas em atraso também são criadas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RecurringForm
            key={editing?.id ?? "new"}
            id={editing?.id ?? null}
            defaultValues={values}
            categories={categoryOptions(options.tree, "EXPENSE")}
            suppliers={options.suppliers}
          />
        </CardContent>
      </Card>

      <div>
        <p className="mb-2 text-sm text-muted-foreground">
          Custo mensal estimado das recorrentes ativas: <strong className="text-foreground tabular-nums">{formatEUR(Math.round(monthlyTotal))}</strong> c/ IVA
        </p>
        <div className="rounded-xl border bg-card">
          <Table>
            <caption className="sr-only">Despesas recorrentes</caption>
            <TableHeader>
              <TableRow>
                <TableHead>Descrição</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Repete</TableHead>
                <TableHead className="text-right">s/ IVA</TableHead>
                <TableHead className="text-right">c/ IVA</TableHead>
                <TableHead>Próxima</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>
                  <span className="sr-only">Ações</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    Sem despesas recorrentes. Adicione renda, subscrições, seguros…
                  </TableCell>
                </TableRow>
              )}
              {rules.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">
                    {r.description}
                    {r.supplier && <div className="text-xs text-muted-foreground">{r.supplier.name}</div>}
                  </TableCell>
                  <TableCell>{r.category.name}</TableCell>
                  <TableCell>
                    {FREQUENCY_LABELS[r.frequency]}
                    {r.interval > 1 && ` (cada ${r.interval})`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(r.netCents)}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatEUR(fromNet(r.netCents, r.vatRateBp).grossCents)}</TableCell>
                  <TableCell>{r.active ? formatDateOnly(r.nextRunDate) : "—"}</TableCell>
                  <TableCell>{r.active ? <Badge variant="success">Ativa</Badge> : <Badge variant="muted">Inativa</Badge>}</TableCell>
                  <TableCell className="text-right whitespace-nowrap">
                    <Button asChild variant="ghost" size="icon" aria-label={`Editar ${r.description}`}>
                      <Link href={`/ledger/recurring?edit=${r.id}`}>
                        <Pencil />
                      </Link>
                    </Button>
                    <ConfirmDeleteButton
                      iconOnly
                      label={`Remover ${r.description}`}
                      title="Remover despesa recorrente?"
                      description={`Deixam de ser criados movimentos. Os ${r._count.transactions} movimentos já criados são mantidos.`}
                      onConfirm={deleteRecurring.bind(null, r.id)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
