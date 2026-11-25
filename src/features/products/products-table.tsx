"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Search, TriangleAlert } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatEUR, formatPercent } from "@/lib/money";
import type { ProductListRow } from "./queries";

const normalise = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

const columns: ColumnDef<ProductListRow>[] = [
  {
    accessorKey: "name",
    header: "Produto",
    cell: ({ row }) => (
      <div className="leading-tight">
        <Link href={`/products/${row.original.id}`} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">
          {row.original.name}
        </Link>
        <div className="text-xs text-muted-foreground">
          {row.original.sku}
          {row.original.variantCount > 0 && ` · ${row.original.variantCount} variantes`}
        </div>
      </div>
    ),
  },
  { accessorKey: "categoryName", header: "Categoria" },
  { accessorKey: "unitCostCents", header: "Custo", meta: { align: "right" }, cell: ({ getValue }) => formatEUR(getValue<number>()) },
  { accessorKey: "priceNetCents", header: "Preço s/ IVA", meta: { align: "right" }, cell: ({ getValue }) => formatEUR(getValue<number>()) },
  { accessorKey: "priceGrossCents", header: "Preço c/ IVA", meta: { align: "right" }, cell: ({ getValue }) => formatEUR(getValue<number>()) },
  { accessorKey: "grossMarginCents", header: "Margem €", meta: { align: "right" }, cell: ({ getValue }) => formatEUR(getValue<number>()) },
  {
    accessorKey: "marginBp",
    header: "Margem %",
    meta: { align: "right" },
    sortUndefined: "last",
    cell: ({ row }) => (
      <div className="leading-tight">
        <span className={row.original.lowMargin ? "inline-flex items-center gap-1 font-semibold text-destructive" : "font-medium"}>
          {row.original.lowMargin && <TriangleAlert className="size-3.5" aria-label="Margem baixa" />}
          {formatPercent(row.original.marginBp)}
        </span>
        {row.original.lowTier && <div className="text-xs font-medium text-warning">escalão abaixo do limite</div>}
      </div>
    ),
  },
  { accessorKey: "markupBp", header: "Markup", meta: { align: "right" }, cell: ({ getValue }) => formatPercent(getValue<number | null>()) },
  {
    accessorKey: "breakEvenQty",
    header: "Equilíbrio",
    meta: { align: "right" },
    cell: ({ getValue }) => {
      const v = getValue<number | null>();
      return v === null ? "—" : `${v} un.`;
    },
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ getValue }) => (getValue<boolean>() ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>),
  },
];

export function ProductsTable({ products, categories }: { products: ProductListRow[]; categories: { id: string; name: string }[] }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lowOnly, setLowOnly] = useState(false);

  const filtered = useMemo(() => {
    const q = normalise(query.trim());
    return products.filter(
      (p) =>
        (!categoryId || p.categoryId === categoryId) &&
        (!lowOnly || p.lowMargin || p.lowTier) &&
        (!q || [p.name, p.sku, p.supplierName, p.categoryName].some((v) => v && normalise(v).includes(q))),
    );
  }, [products, query, categoryId, lowOnly]);

  const lowCount = products.filter((p) => p.lowMargin || p.lowTier).length;

  return (
    <div className="space-y-4">
      <div role="search" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_auto] lg:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="product-search">Pesquisar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input id="product-search" type="search" placeholder="Nome, SKU, fornecedor…" className="pl-8" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="product-category">Categoria</Label>
          <NativeSelect id="product-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex h-9 items-center gap-2">
          <input id="product-low" type="checkbox" className="size-4 accent-primary" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          <label htmlFor="product-low" className="text-sm font-medium whitespace-nowrap">
            Só margem baixa ({lowCount})
          </label>
        </div>
      </div>
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "produto" : "produtos"}
      </p>
      <DataTable
        columns={columns}
        data={filtered}
        caption="Lista de produtos com custos e margens"
        emptyMessage="Nenhum produto corresponde aos filtros."
        rowClassName={(r) => (r.lowMargin ? "bg-red-50/60" : undefined)}
      />
    </div>
  );
}
