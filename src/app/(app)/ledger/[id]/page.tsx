import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, FileText, Pencil } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { deleteAttachment, deleteTransaction } from "@/features/ledger/actions";
import { getTransaction } from "@/features/ledger/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/ledger/schema";
import { formatDateOnly, todayInLisbon } from "@/lib/dates";
import { formatEUR, formatPercent } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Movimento" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? "—"}</dd>
    </div>
  );
}

export default async function TransactionPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const t = await getTransaction(id);
  if (!t) notFound();
  const overdue = t.status === "PENDING" && (t.dueDate ?? t.date) < todayInLisbon();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/ledger" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-4" aria-hidden="true" /> Movimentos
          </Link>
          <h2 className="text-xl font-semibold">{t.description}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={t.type === "INCOME" ? "success" : "secondary"}>{t.type === "INCOME" ? "Receita" : "Despesa"}</Badge>
            {t.status === "PAID" ? (
              <Badge variant="success">{t.type === "INCOME" ? "Recebido" : "Pago"}</Badge>
            ) : (
              <Badge variant={overdue ? "destructive" : "warning"}>{overdue ? "Vencido" : "Pendente"}</Badge>
            )}
            {t.recurring && <Badge variant="outline">Recorrente: {t.recurring.description}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/ledger/${t.id}/edit`}>
              <Pencil aria-hidden="true" /> Editar
            </Link>
          </Button>
          <ConfirmDeleteButton
            title="Eliminar movimento?"
            description="O movimento deixa de contar nos totais. Fica guardado no histórico (eliminação lógica)."
            onConfirm={deleteTransaction.bind(null, t.id)}
            redirectTo="/ledger"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          ["Valor s/ IVA", formatEUR(t.netCents)],
          [`IVA (${formatPercent(t.vatRateBp)})`, formatEUR(t.vatCents)],
          ["Valor c/ IVA", formatEUR(t.grossCents)],
        ].map(([l, v]) => (
          <Card key={l} className="py-4">
            <CardHeader className="px-4">
              <p className="text-sm text-muted-foreground">{l}</p>
              <p className="text-2xl font-semibold tabular-nums">{v}</p>
            </CardHeader>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y">
            <Row label="Data">{formatDateOnly(t.date)}</Row>
            <Row label="Vencimento">{t.dueDate && formatDateOnly(t.dueDate)}</Row>
            <Row label="Pago em">{t.paidAt && formatDateOnly(t.paidAt)}</Row>
            <Row label="Categoria">{t.category.parent ? `${t.category.parent.name} › ${t.category.name}` : t.category.name}</Row>
            <Row label="Meio de pagamento">{t.paymentMethod && PAYMENT_METHOD_LABELS[t.paymentMethod]}</Row>
            <Row label="Fornecedor">{t.supplier && <Link className="text-primary underline" href={`/suppliers/${t.supplier.id}`}>{t.supplier.name}</Link>}</Row>
            <Row label="Cliente">{t.customer?.name}</Row>
            <Row label="Produto">{t.product && <Link className="text-primary underline" href={`/products/${t.product.id}`}>{t.product.name}</Link>}</Row>
            <Row label="Documento">{t.invoiceRef}</Row>
            <Row label="Notas">{t.notes && <span className="whitespace-pre-line">{t.notes}</span>}</Row>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Anexos</CardTitle>
        </CardHeader>
        <CardContent>
          {t.attachments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem anexos. Adicione a fatura ou recibo em Editar.</p>
          ) : (
            <ul className="divide-y text-sm">
              {t.attachments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2">
                  <a href={`/api/files/${a.id}`} target="_blank" rel="noreferrer" className="inline-flex min-w-0 items-center gap-2 text-primary hover:underline">
                    <FileText className="size-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{a.originalName}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">({Math.ceil(a.sizeBytes / 1024)} KB)</span>
                  </a>
                  <ConfirmDeleteButton
                    iconOnly
                    label="Remover anexo"
                    title="Remover anexo?"
                    description={`O ficheiro ${a.originalName} será apagado.`}
                    onConfirm={deleteAttachment.bind(null, a.id)}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
