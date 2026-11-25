"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";
import { Search } from "lucide-react";

import { DataTable } from "@/components/data-table";
import { RatingStars } from "@/components/rating-stars";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { formatEUR } from "@/lib/money";
import type { SupplierListRow } from "./queries";

const normalise = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

const columns: ColumnDef<SupplierListRow>[] = [
  {
    accessorKey: "name",
    header: "Nome",
    cell: ({ row }) => (
      <Link
        href={`/suppliers/${row.original.id}`}
        className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline"
      >
        {row.original.name}
      </Link>
    ),
  },
  { accessorKey: "categoryName", header: "Categoria" },
  {
    id: "contact",
    header: "Contacto",
    enableSorting: false,
    cell: ({ row }) => (
      <div className="leading-tight">
        <div>{row.original.contactName ?? "—"}</div>
        <div className="text-xs text-muted-foreground">{row.original.email ?? row.original.phone ?? ""}</div>
      </div>
    ),
  },
  {
    accessorKey: "rating",
    header: "Avaliação",
    sortUndefined: "last",
    cell: ({ row }) => <RatingStars value={row.original.rating} />,
  },
  { accessorKey: "productCount", header: "Produtos", meta: { align: "right" } },
  {
    accessorKey: "totalSpentGrossCents",
    header: "Total gasto",
    meta: { align: "right" },
    cell: ({ getValue }) => formatEUR(getValue<number>()),
  },
  {
    accessorKey: "active",
    header: "Estado",
    cell: ({ getValue }) =>
      getValue<boolean>() ? <Badge variant="success">Ativo</Badge> : <Badge variant="muted">Inativo</Badge>,
  },
];

export function SuppliersTable({
  suppliers,
  categories,
}: {
  suppliers: SupplierListRow[];
  categories: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("active");
  const [grouped, setGrouped] = useState(false);

  const filtered = useMemo(() => {
    const q = normalise(query.trim());
    return suppliers.filter((s) => {
      if (categoryId && s.categoryId !== categoryId) return false;
      if (status === "active" && !s.active) return false;
      if (status === "inactive" && s.active) return false;
      if (!q) return true;
      return [s.name, s.contactName, s.email, s.city, s.categoryName].some((v) => v && normalise(v).includes(q));
    });
  }, [suppliers, query, categoryId, status]);

  const groups = useMemo(() => {
    if (!grouped) return null;
    return categories
      .map((c) => ({ ...c, rows: filtered.filter((s) => s.categoryId === c.id) }))
      .filter((g) => g.rows.length > 0);
  }, [grouped, categories, filtered]);

  return (
    <div className="space-y-4">
      <div role="search" className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_10rem_auto] lg:items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="supplier-search">Pesquisar</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="supplier-search"
              type="search"
              placeholder="Nome, contacto, email, localidade…"
              className="pl-8"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="supplier-category">Categoria</Label>
          <NativeSelect id="supplier-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="supplier-status">Estado</Label>
          <NativeSelect id="supplier-status" value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
            <option value="all">Todos</option>
          </NativeSelect>
        </div>
        <div className="flex h-9 items-center gap-2">
          <input
            id="supplier-group"
            type="checkbox"
            className="size-4 accent-primary"
            checked={grouped}
            onChange={(e) => setGrouped(e.target.checked)}
          />
          <label htmlFor="supplier-group" className="text-sm font-medium whitespace-nowrap">
            Agrupar por categoria
          </label>
        </div>
      </div>

      <p className="text-sm text-muted-foreground" aria-live="polite">
        {filtered.length} {filtered.length === 1 ? "fornecedor" : "fornecedores"}
      </p>

      {groups ? (
        groups.length ? (
          groups.map((g) => (
            <section key={g.id} aria-labelledby={`group-${g.id}`} className="space-y-2">
              <h2 id={`group-${g.id}`} className="text-base font-semibold">
                {g.name} <span className="font-normal text-muted-foreground">({g.rows.length})</span>
              </h2>
              <DataTable columns={columns} data={g.rows} caption={`Fornecedores: ${g.name}`} />
            </section>
          ))
        ) : (
          <DataTable columns={columns} data={[]} caption="Fornecedores" emptyMessage="Nenhum fornecedor corresponde aos filtros." />
        )
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          caption="Lista de fornecedores"
          emptyMessage="Nenhum fornecedor corresponde aos filtros."
        />
      )}
    </div>
  );
}
