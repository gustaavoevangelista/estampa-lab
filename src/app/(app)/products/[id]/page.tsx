import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft, Pencil } from "lucide-react";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deleteProduct } from "@/features/products/actions";
import { COST_ITEM_LABELS, costLineCents, TECHNIQUE_LABELS } from "@/features/products/costing";
import { EconomicsSummary } from "@/features/products/economics-summary";
import { getProduct, productEconomics } from "@/features/products/queries";
import { WhatIfPricing } from "@/features/products/what-if";
import { getSettings } from "@/features/settings/settings";
import { formatEUR, formatPercent, fromNet, margin } from "@/lib/money";
import { requireUser } from "@/lib/session";
import { cn } from "@/lib/utils";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const p = await getProduct(id);
  return { title: p?.name ?? "Produto" };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const [p, settings] = await Promise.all([getProduct(id), getSettings()]);
  if (!p) notFound();
  const e = productEconomics(p, settings);

  return (
    <>
      <Link href="/products" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="size-4" aria-hidden="true" /> Produtos
      </Link>
      <PageHeader
        title={p.name}
        description={`${p.sku} · ${p.category.name}${p.supplier ? ` · ${p.supplier.name}` : ""}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm">
              <Link href={`/products/${p.id}/edit`}>
                <Pencil aria-hidden="true" /> Editar
              </Link>
            </Button>
            <ConfirmDeleteButton
              title="Eliminar produto?"
              description="O produto deixa de aparecer no catálogo. Os movimentos ligados a ele são mantidos."
              onConfirm={deleteProduct.bind(null, p.id)}
              redirectTo="/products"
            />
          </>
        }
      />
      <div className="mb-6 flex gap-2">
        {p.active ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>}
        <Badge variant="outline">IVA {formatPercent(p.vatRateBp)}</Badge>
        {(e.lowMargin || e.anyTierLow) && <Badge variant="destructive">Margem baixa</Badge>}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_22rem] xl:items-start">
        <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
          <Card>
            <CardHeader>
              <CardTitle>Custo por unidade</CardTitle>
              <CardDescription>Valores sem IVA. Mão de obra a {formatEUR(settings.labourHourlyRateCents)}/h salvo indicação.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg border">
                <Table>
                  <caption className="sr-only">Decomposição do custo unitário</caption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Fornecedor</TableHead>
                      <TableHead className="text-right">Custo</TableHead>
                      <TableHead className="text-right">% do custo</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {p.costItems.map((c) => {
                      const cost = costLineCents(c, settings.labourHourlyRateCents);
                      return (
                        <TableRow key={c.id}>
                          <TableCell>{COST_ITEM_LABELS[c.type]}</TableCell>
                          <TableCell>
                            {c.label}
                            {c.technique && <span className="text-muted-foreground"> · {TECHNIQUE_LABELS[c.technique]}</span>}
                            {c.type === "LABOUR" && (
                              <span className="text-muted-foreground">
                                {" "}
                                · {c.labourMinutes} min × {formatEUR(c.hourlyRateCents ?? settings.labourHourlyRateCents)}/h
                              </span>
                            )}
                          </TableCell>
                          <TableCell>{c.supplier?.name ?? "—"}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(cost)}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {e.unitCostCents ? formatPercent(Math.round((cost * 10000) / e.unitCostCents)) : "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                  <TableFooter>
                    <TableRow>
                      <TableCell colSpan={3}>Custo unitário total</TableCell>
                      <TableCell className="text-right tabular-nums">{formatEUR(e.unitCostCents)}</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
              {p.fixedCosts.length > 0 && (
                <div className="mt-4 text-sm">
                  <h3 className="mb-1 font-semibold">Custos fixos / preparação</h3>
                  <ul className="list-inside list-disc text-muted-foreground">
                    {p.fixedCosts.map((f) => (
                      <li key={f.id}>
                        {f.label}: <span className="text-foreground tabular-nums">{formatEUR(f.amountNetCents)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Escalões de quantidade</CardTitle>
              <CardDescription>Margem recalculada por escalão. A última coluna inclui os custos fixos repartidos pela quantidade mínima.</CardDescription>
            </CardHeader>
            <CardContent>
              {e.tiers.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem escalões. Aplica-se sempre o preço base.</p>
              ) : (
                <div className="rounded-lg border">
                  <Table>
                    <caption className="sr-only">Escalões de preço e margem</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Quantidade</TableHead>
                        <TableHead className="text-right">Preço s/ IVA</TableHead>
                        <TableHead className="text-right">Preço c/ IVA</TableHead>
                        <TableHead className="text-right">Margem €</TableHead>
                        <TableHead className="text-right">Margem %</TableHead>
                        <TableHead className="text-right">Markup</TableHead>
                        <TableHead className="text-right">Margem c/ fixos</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {e.tiers.map((t) => (
                        <TableRow key={t.minQty} className={t.lowMargin ? "bg-red-50/60" : undefined}>
                          <TableCell className="font-medium">{t.maxQty === null ? `${t.minQty}+` : `${t.minQty}–${t.maxQty}`}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(t.unitPriceNetCents)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(t.priceGrossCents)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatEUR(t.grossMarginCents)}</TableCell>
                          <TableCell className={cn("text-right tabular-nums", t.lowMargin && "font-semibold text-destructive")}>
                            {formatPercent(t.marginBp)}
                          </TableCell>
                          <TableCell className="text-right tabular-nums">{formatPercent(t.markupBp)}</TableCell>
                          <TableCell className="text-right tabular-nums">{formatPercent(t.marginAtMinQtyWithFixedBp)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {p.variants.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Variantes</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <caption className="sr-only">Variantes</caption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>SKU</TableHead>
                        <TableHead>Tamanho</TableHead>
                        <TableHead>Cor</TableHead>
                        <TableHead className="text-right">Custo</TableHead>
                        <TableHead className="text-right">Preço s/ IVA</TableHead>
                        <TableHead className="text-right">Preço c/ IVA</TableHead>
                        <TableHead className="text-right">Margem %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {p.variants.map((v) => {
                        const cost = e.unitCostCents + v.extraCostNetCents;
                        const price = v.salePriceNetCents ?? p.baseSalePriceNetCents;
                        const m = margin(price, cost);
                        const low = m.marginBp === null || m.marginBp < e.marginWarningBp;
                        return (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">{v.sku}</TableCell>
                            <TableCell>{v.size ?? "—"}</TableCell>
                            <TableCell>{v.colour ?? "—"}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatEUR(cost)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatEUR(price)}</TableCell>
                            <TableCell className="text-right tabular-nums">{formatEUR(fromNet(price, p.vatRateBp).grossCents)}</TableCell>
                            <TableCell className={cn("text-right tabular-nums", low && "font-semibold text-destructive")}>
                              {formatPercent(m.marginBp)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {p.description && (
            <Card>
              <CardHeader>
                <CardTitle>Descrição</CardTitle>
              </CardHeader>
              <CardContent className="text-sm whitespace-pre-line">{p.description}</CardContent>
            </Card>
          )}
        </div>

        <aside aria-label="Resumo de margem" className="grid gap-4 xl:sticky xl:top-20">
          <Card>
            <CardHeader>
              <CardTitle>Resumo (preço base)</CardTitle>
            </CardHeader>
            <CardContent>
              <EconomicsSummary e={e} fixedCostsCents={e.fixedCostsCents} marginWarningBp={e.marginWarningBp} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Simular preço</CardTitle>
              <CardDescription>Preço necessário para uma margem pretendida.</CardDescription>
            </CardHeader>
            <CardContent>
              <WhatIfPricing unitCostCents={e.unitCostCents} vatRateBp={p.vatRateBp} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}
