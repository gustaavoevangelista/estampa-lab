"use client";

import { useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

type Option = { id: string; label: string; depth?: number; type?: string };

/** Filter bar: every change updates the URL; the server page re-renders with the new filters. */
export function LedgerFilters({
  view,
  period,
  from,
  to,
  categories,
  suppliers,
}: {
  view: "month" | "year" | "custom";
  period: string;
  from: string;
  to: string;
  categories: Option[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(params.get("q") ?? "");

  function update(changes: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    startTransition(() => router.replace(`${pathname}?${next.toString()}`, { scroll: false }));
  }

  // Debounced search
  useEffect(() => {
    const current = params.get("q") ?? "";
    if (q === current) return;
    const t = setTimeout(() => update({ q: q || null }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const type = params.get("type") ?? "";

  return (
    <div role="search" aria-busy={pending} className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[9rem_10rem_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="f-view">Vista</Label>
        <NativeSelect
          id="f-view"
          value={view}
          onChange={(e) => update({ view: e.target.value, period: null, from: e.target.value === "custom" ? from : null, to: e.target.value === "custom" ? to : null })}
        >
          <option value="month">Mensal</option>
          <option value="year">Anual</option>
          <option value="custom">Intervalo</option>
        </NativeSelect>
      </div>
      {view === "custom" ? (
        <>
          <div className="grid gap-1.5">
            <Label htmlFor="f-from">De</Label>
            <Input id="f-from" type="date" value={from} onChange={(e) => update({ from: e.target.value })} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="f-to">Até</Label>
            <Input id="f-to" type="date" value={to} onChange={(e) => update({ to: e.target.value })} />
          </div>
        </>
      ) : (
        <div className="grid gap-1.5">
          <Label htmlFor="f-period">{view === "year" ? "Ano" : "Mês"}</Label>
          {view === "year" ? (
            <Input id="f-period" inputMode="numeric" value={period} onChange={(e) => /^\d{4}$/.test(e.target.value) && update({ period: e.target.value })} />
          ) : (
            <Input id="f-period" type="month" value={period} onChange={(e) => e.target.value && update({ period: e.target.value })} />
          )}
        </div>
      )}
      <div className="grid gap-1.5">
        <Label htmlFor="f-type">Tipo</Label>
        <NativeSelect id="f-type" value={type} onChange={(e) => update({ type: e.target.value || null, categoryId: null })}>
          <option value="">Todos</option>
          <option value="INCOME">Receitas</option>
          <option value="EXPENSE">Despesas</option>
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-category">Categoria</Label>
        <NativeSelect id="f-category" value={params.get("categoryId") ?? ""} onChange={(e) => update({ categoryId: e.target.value || null })}>
          <option value="">Todas</option>
          {categories
            .filter((c) => !type || c.type === type)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.depth ? `   ${c.label}` : c.label}
              </option>
            ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-supplier">Fornecedor</Label>
        <NativeSelect id="f-supplier" value={params.get("supplierId") ?? ""} onChange={(e) => update({ supplierId: e.target.value || null })}>
          <option value="">Todos</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="f-q">Pesquisar</Label>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input id="f-q" type="search" placeholder="Descrição, documento…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>
      <div className="flex h-9 items-center gap-2">
        {pending ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="A atualizar" />
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setQ("");
              startTransition(() => router.replace(pathname, { scroll: false }));
            }}
          >
            <X aria-hidden="true" /> Limpar
          </Button>
        )}
      </div>
    </div>
  );
}
