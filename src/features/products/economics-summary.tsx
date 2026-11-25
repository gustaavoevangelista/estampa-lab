import { TriangleAlert } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatEUR, formatPercent } from "@/lib/money";
import type { Economics } from "./costing";

function Row({ label, value, strong, tone }: { label: string; value: string; strong?: boolean; tone?: "bad" | "good" }) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "tabular-nums",
          strong && "text-lg font-semibold",
          tone === "bad" && "text-destructive",
          tone === "good" && "text-success",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function EconomicsSummary({
  e,
  fixedCostsCents,
  marginWarningBp,
}: {
  e: Economics;
  fixedCostsCents: number;
  marginWarningBp: number;
}) {
  return (
    <div>
      {e.lowMargin && (
        <p role="status" className="mb-3 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-warning">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          Margem abaixo do limite de {formatPercent(marginWarningBp)}.
        </p>
      )}
      <dl className="divide-y">
        <Row label="Custo unitário" value={formatEUR(e.unitCostCents)} />
        <Row label="Preço de venda s/ IVA" value={formatEUR(e.priceNetCents)} />
        <Row label="Preço de venda c/ IVA" value={formatEUR(e.priceGrossCents)} />
        <Row
          label="Margem bruta"
          value={formatEUR(e.grossMarginCents)}
          strong
          tone={e.grossMarginCents < 0 ? "bad" : undefined}
        />
        <Row label="Margem %" value={formatPercent(e.marginBp)} strong tone={e.lowMargin ? "bad" : "good"} />
        <Row label="Markup %" value={formatPercent(e.markupBp)} />
        <Row label="Custos fixos / preparação" value={formatEUR(fixedCostsCents)} />
        <Row
          label="Ponto de equilíbrio"
          value={e.breakEvenQty === null ? "Nunca (margem ≤ 0)" : `${e.breakEvenQty} un.`}
          tone={e.breakEvenQty === null ? "bad" : undefined}
        />
      </dl>
    </div>
  );
}
