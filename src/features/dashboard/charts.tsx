"use client";

import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipContentProps,
} from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { formatEUR, formatPercent } from "@/lib/money";

// Validated (light surface): blue/orange pass CVD + normal-vision separation.
const INCOME = "#2F5D9E";
const EXPENSE = "#E07B16";
const SINGLE = "#2F5D9E";
const LOW = "#C0261D";
const AXIS = { fontSize: 12, fill: "#5b6478" };

const compactEUR = (cents: number) =>
  new Intl.NumberFormat("pt-PT", { style: "currency", currency: "EUR", notation: "compact", maximumFractionDigits: 1 }).format(cents / 100);
const monthLabel = (iso: string) =>
  new Intl.DateTimeFormat("pt-PT", { month: "short", timeZone: "UTC" }).format(new Date(iso)).replace(".", "");

function TooltipBox({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border bg-card px-3 py-2 text-sm shadow-md">{children}</div>;
}

function TableToggle({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-2">
      <button type="button" className="text-xs text-primary underline-offset-4 hover:underline" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? "Esconder tabela" : "Ver dados em tabela"}
      </button>
      {open && <div className="mt-2 overflow-x-auto">{children}</div>}
    </div>
  );
}

export function IncomeExpensesChart({ data }: { data: { month: string; income: number; expenses: number; result: number }[] }) {
  return (
    <div>
      <div className="h-72" role="img" aria-label="Gráfico de barras: receitas e despesas sem IVA por mês">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="28%" margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke="#ebe8e2" />
            <XAxis dataKey="month" tickFormatter={monthLabel} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={compactEUR} tick={AXIS} axisLine={false} tickLine={false} width={64} />
            <Tooltip
              cursor={{ fill: "rgba(27,42,74,0.06)" }}
              content={({ active, payload, label }: TooltipContentProps<ValueType, NameType>) =>
                active && payload?.length ? (
                  <TooltipBox>
                    <p className="mb-1 font-medium capitalize">
                      {new Intl.DateTimeFormat("pt-PT", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(String(label)))}
                    </p>
                    {payload.map((p) => (
                      <p key={String(p.dataKey)} className="flex items-center gap-2 tabular-nums">
                        <span className="size-2.5 rounded-sm" style={{ background: p.color }} aria-hidden="true" />
                        {p.name}: {formatEUR(Number(p.value))}
                      </p>
                    ))}
                    <p className="mt-1 border-t pt-1 tabular-nums">Resultado: {formatEUR((payload[0].payload as { result: number }).result)}</p>
                  </TooltipBox>
                ) : null
              }
            />
            <Legend iconType="square" iconSize={10} wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="income" name="Receitas" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="expenses" name="Despesas" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableToggle>
        <table className="w-full text-sm">
          <caption className="sr-only">Receitas e despesas por mês</caption>
          <thead>
            <tr className="text-left text-muted-foreground">
              <th className="py-1 font-medium">Mês</th>
              <th className="py-1 text-right font-medium">Receitas</th>
              <th className="py-1 text-right font-medium">Despesas</th>
              <th className="py-1 text-right font-medium">Resultado</th>
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.month} className="border-t">
                <td className="py-1 capitalize">{monthLabel(d.month)}</td>
                <td className="py-1 text-right">{formatEUR(d.income)}</td>
                <td className="py-1 text-right">{formatEUR(d.expenses)}</td>
                <td className="py-1 text-right">{formatEUR(d.result)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

export function ExpensesByCategoryChart({ data }: { data: { name: string; cents: number }[] }) {
  const total = data.reduce((a, d) => a + d.cents, 0);
  return (
    <div>
      <div style={{ height: Math.max(160, data.length * 34 + 24) }} role="img" aria-label="Gráfico de barras: despesas sem IVA por categoria">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap={6} margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#ebe8e2" />
            <XAxis type="number" tickFormatter={compactEUR} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={150} />
            <Tooltip
              cursor={{ fill: "rgba(27,42,74,0.06)" }}
              content={({ active, payload }: TooltipContentProps<ValueType, NameType>) =>
                active && payload?.length ? (
                  <TooltipBox>
                    <p className="font-medium">{(payload[0].payload as { name: string }).name}</p>
                    <p className="tabular-nums">
                      {formatEUR(Number(payload[0].value))} · {total ? formatPercent(Math.round((Number(payload[0].value) * 10000) / total)) : "—"}
                    </p>
                  </TooltipBox>
                ) : null
              }
            />
            <Bar dataKey="cents" name="Despesas" fill={SINGLE} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <TableToggle>
        <table className="w-full text-sm">
          <caption className="sr-only">Despesas por categoria</caption>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.name} className="border-t">
                <td className="py-1">{d.name}</td>
                <td className="py-1 text-right">{formatEUR(d.cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}

export function MarginByProductChart({
  data,
  thresholdBp,
}: {
  data: { id: string; name: string; marginBp: number; low: boolean }[];
  thresholdBp: number;
}) {
  return (
    <div>
      <div style={{ height: Math.max(180, data.length * 30 + 40) }} role="img" aria-label="Gráfico de barras: margem por produto, com linha do limite de alerta">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" barCategoryGap={6} margin={{ top: 16, right: 24, left: 0, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke="#ebe8e2" />
            <XAxis type="number" domain={[0, "dataMax"]} tickFormatter={(v: number) => formatPercent(v, 0)} tick={AXIS} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={AXIS} axisLine={false} tickLine={false} width={190} />
            <ReferenceLine
              x={thresholdBp}
              stroke={LOW}
              strokeDasharray="4 3"
              label={{ value: `limite ${formatPercent(thresholdBp, 0)}`, position: "top", fontSize: 11, fill: LOW }}
            />
            <Tooltip
              cursor={{ fill: "rgba(27,42,74,0.06)" }}
              content={({ active, payload }: TooltipContentProps<ValueType, NameType>) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as { name: string; marginBp: number; low: boolean };
                return (
                  <TooltipBox>
                    <p className="font-medium">{d.name}</p>
                    <p className="tabular-nums">
                      Margem {formatPercent(d.marginBp)}
                      {d.low && <span className="ml-1 font-medium text-destructive">· abaixo do limite</span>}
                    </p>
                  </TooltipBox>
                );
              }}
            />
            <Bar dataKey="marginBp" name="Margem" radius={[0, 4, 4, 0]} maxBarSize={20}>
              {data.map((d) => (
                <Cell key={d.id} fill={d.low ? LOW : SINGLE} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: SINGLE }} aria-hidden="true" /> Margem acima do limite
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm" style={{ background: LOW }} aria-hidden="true" /> Abaixo do limite
        </span>
      </p>
      <TableToggle>
        <table className="w-full text-sm">
          <caption className="sr-only">Margem por produto</caption>
          <tbody className="tabular-nums">
            {data.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="py-1">{d.name}</td>
                <td className="py-1 text-right">
                  {formatPercent(d.marginBp)}
                  {d.low && " (abaixo do limite)"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableToggle>
    </div>
  );
}
