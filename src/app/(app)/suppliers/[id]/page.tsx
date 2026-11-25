import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDownRight, ArrowUpRight, ChevronLeft, Pencil } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteSupplier, deleteSupplierPrice } from "@/features/suppliers/actions";
import { AddPriceForm } from "@/features/suppliers/add-price-form";
import { getProductOptions, getSupplierDetail } from "@/features/suppliers/queries";
import { formatDateOnly } from "@/lib/dates";
import { BP_SCALE, divRound, formatEUR, formatPercent } from "@/lib/money";
import { requireUser } from "@/lib/session";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const s = await getSupplierDetail(id);
  return { title: s?.name ?? "Fornecedor" };
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-2 py-1.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-words">{children ?? "—"}</dd>
    </div>
  );
}

export default async function SupplierDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [s, products] = await Promise.all([getSupplierDetail(id), getProductOptions()]);
  if (!s) notFound();

  // Price history: entries are sorted by item then newest first; compare each with the next (older) one.
  const priceRows = s.prices.map((p, i) => {
    const prev = s.prices[i + 1];
    const changeBp =
      prev && prev.itemName === p.itemName && prev.unitCostNetCents > 0
        ? divRound((p.unitCostNetCents - prev.unitCostNetCents) * BP_SCALE, prev.unitCostNetCents)
        : null;
    const isLatest = i === 0 || s.prices[i - 1].itemName !== p.itemName;
    return { ...p, changeBp, isLatest };
  });
  const itemNames = [...new Set(s.prices.map((p) => p.itemName))];

  return (
    <>
      <Link href="/suppliers" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Fornecedores
      </Link>
      <PageHeader
        title={s.name}
        description={s.category.name}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/suppliers/${s.id}/edit`}>
                <Pencil aria-hidden="true" /> Editar
              </Link>
            </Button>
            <ConfirmDeleteButton
              title="Eliminar fornecedor?"
              description="O fornecedor deixa de aparecer nas listas. As despesas e o histórico de preços são mantidos."
              onConfirm={deleteSupplier.bind(null, s.id)}
              redirectTo="/suppliers"
            />
          </>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        {s.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>}
        <RatingStars value={s.rating} />
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Total gasto (c/ IVA)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatEUR(s.spend.grossCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total gasto (s/ IVA)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{formatEUR(s.spend.netCents)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Despesas registadas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{s.spend.count}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Dados</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="divide-y">
              <InfoRow label="NIF">{s.vatNumber}</InfoRow>
              <InfoRow label="Contacto">{s.contactName}</InfoRow>
              <InfoRow label="Email">{s.email && <a className="text-primary underline" href={`mailto:${s.email}`}>{s.email}</a>}</InfoRow>
              <InfoRow label="Telefone">{s.phone && <a className="text-primary underline" href={`tel:${s.phone}`}>{s.phone}</a>}</InfoRow>
              <InfoRow label="Website">
                {s.website && (
                  <a className="text-primary underline" href={s.website} target="_blank" rel="noreferrer">
                    {s.website.replace(/^https?:\/\//, "")}
                  </a>
                )}
              </InfoRow>
              <InfoRow label="Morada">
                {[s.addressLine, [s.postalCode, s.city].filter(Boolean).join(" "), s.country].filter(Boolean).join(", ") || null}
              </InfoRow>
              <InfoRow label="Prazo de pagamento">{s.paymentTermsDays !== null ? `${s.paymentTermsDays} dias` : null}</InfoRow>
              <InfoRow label="Prazo de entrega">{s.leadTimeDays !== null ? `${s.leadTimeDays} dias` : null}</InfoRow>
              <InfoRow label="Encomenda mínima">{s.minOrderNetCents !== null ? `${formatEUR(s.minOrderNetCents)} s/ IVA` : null}</InfoRow>
              <InfoRow label="Notas">{s.notes && <span className="whitespace-pre-line">{s.notes}</span>}</InfoRow>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Produtos ligados</CardTitle>
            <CardDescription>Produtos em que este é o fornecedor principal.</CardDescription>
          </CardHeader>
          <CardContent>
            {s.products.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum produto ligado.</p>
            ) : (
              <ul className="divide-y text-sm">
                {s.products.map((p) => (
                  <li key={p.id} className="flex justify-between gap-3 py-2">
                    <Link href={`/products/${p.id}`} className="font-medium text-primary hover:underline">
                      {p.name}
                    </Link>
                    <span className="text-muted-foreground">{p.category.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Histórico de preços</CardTitle>
            <CardDescription>Custos unitários sem IVA. A variação compara com o preço anterior do mesmo artigo.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <AddPriceForm supplierId={s.id} products={products} itemNames={itemNames} />
            {priceRows.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ainda não há preços registados.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <caption className="sr-only">Histórico de preços</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Artigo</TableHead>
                      <TableHead>Desde</TableHead>
                      <TableHead className="text-right">Custo s/ IVA</TableHead>
                      <TableHead className="text-right">Variação</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>
                        <span className="sr-only">Ações</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {priceRows.map((p) => (
                      <TableRow key={p.id} className={p.isLatest ? undefined : "text-muted-foreground"}>
                        <TableCell className="font-medium">
                          {p.itemName}
                          {p.isLatest && <Badge variant="secondary" className="ml-2">Atual</Badge>}
                        </TableCell>
                        <TableCell>{formatDateOnly(p.validFrom)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEUR(p.unitCostNetCents)}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {p.changeBp === null ? (
                            "—"
                          ) : (
                            <span className={p.changeBp > 0 ? "text-destructive" : p.changeBp < 0 ? "text-success" : undefined}>
                              {p.changeBp > 0 ? (
                                <ArrowUpRight className="mr-0.5 inline size-3.5" aria-label="subiu" />
                              ) : p.changeBp < 0 ? (
                                <ArrowDownRight className="mr-0.5 inline size-3.5" aria-label="desceu" />
                              ) : null}
                              {formatPercent(Math.abs(p.changeBp))}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>{p.product?.name ?? "—"}</TableCell>
                        <TableCell className="text-right">
                          <ConfirmDeleteButton
                            iconOnly
                            label="Remover registo"
                            title="Remover este preço?"
                            description={`${p.itemName}, ${formatEUR(p.unitCostNetCents)} desde ${formatDateOnly(p.validFrom)}.`}
                            onConfirm={deleteSupplierPrice.bind(null, p.id)}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardTitle>Últimas despesas</CardTitle>
          </CardHeader>
          <CardContent>
            {s.transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem despesas registadas para este fornecedor.</p>
            ) : (
              <div className="rounded-lg border">
                <Table>
                  <caption className="sr-only">Últimas despesas</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead className="text-right">s/ IVA</TableHead>
                      <TableHead className="text-right">c/ IVA</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {s.transactions.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{formatDateOnly(t.date)}</TableCell>
                        <TableCell>{t.description}</TableCell>
                        <TableCell>{t.category.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEUR(t.netCents)}</TableCell>
                        <TableCell className="text-right tabular-nums">{formatEUR(t.grossCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
