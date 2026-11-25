"use client";

import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatAmount, formatEUR, formatPercent, parsePercentToBp } from "@/lib/money";
import { whatIf } from "./costing";

/** "Qual o preço para X % de margem?" helper. */
export function WhatIfPricing({
  unitCostCents,
  vatRateBp,
  onApply,
}: {
  unitCostCents: number;
  vatRateBp: number;
  onApply?: (priceNetInput: string) => void;
}) {
  const id = useId();
  const [target, setTarget] = useState("40");
  const bp = parsePercentToBp(target);
  const result = bp === null ? null : whatIf(unitCostCents, bp, vatRateBp);

  return (
    <div className="space-y-3">
      <div className="grid gap-1.5">
        <Label htmlFor={id}>Margem pretendida (%)</Label>
        <Input id={id} inputMode="decimal" value={target} onChange={(e) => setTarget(e.target.value)} className="max-w-32" />
      </div>
      <div aria-live="polite" className="text-sm">
        {bp === null ? (
          <p className="text-destructive">Indique uma percentagem entre 0 e 100.</p>
        ) : result === null ? (
          <p className="text-destructive">Uma margem de 100 % ou mais não é possível.</p>
        ) : (
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">Preço sugerido s/ IVA</dt>
            <dd className="text-right font-semibold tabular-nums">{formatEUR(result.priceNetCents)}</dd>
            <dt className="text-muted-foreground">Preço sugerido c/ IVA</dt>
            <dd className="text-right tabular-nums">{formatEUR(result.priceGrossCents)}</dd>
            <dt className="text-muted-foreground">Margem / markup</dt>
            <dd className="text-right tabular-nums">
              {formatPercent(result.marginBp)} / {formatPercent(result.markupBp)}
            </dd>
          </dl>
        )}
      </div>
      {onApply && result && (
        <Button type="button" variant="secondary" size="sm" onClick={() => onApply(formatAmount(result.priceNetCents))}>
          Usar este preço
        </Button>
      )}
    </div>
  );
}
