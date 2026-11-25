"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ColumnDef } from "@tanstack/react-table";
import { Check, Paperclip, Repeat } from "lucide-react";
import { toast } from "sonner";

import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateOnly } from "@/lib/dates";
import { formatEUR, formatPercent } from "@/lib/money";
import { markTransactionPaid } from "./actions";

export interface LedgerTableRow {
  id: string;
  date: string; // ISO
  type: "INCOME" | "EXPENSE";
  description: string;
  category: string;
  party: string | null;
  netCents: number;
  vatRateBp: number;
  vatCents: number;
  grossCents: number;
  status: "PAID" | "PENDING";
  overdue: boolean;
  dueDate: string | null;
  attachments: number;
  recurring: boolean;
}

function MarkPaid({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await markTransactionPaid(id);
          if (r.ok) {
            toast.success(r.message);
            router.refresh();
          } else toast.error(r.error);
        })
      }
    >
      <Check aria-hidden="true" /> Marcar pago
    </Button>
  );
}

const signed = (row: LedgerTableRow, cents: number) => (
  <span className={row.type === "INCOME" ? "text-success" : undefined}>
    {row.type === "EXPENSE" ? "−" : "+"}
    {formatEUR(cents)}
  </span>
);

const columns: ColumnDef<LedgerTableRow>[] = [
  { accessorKey: "date", header: "Data", cell: ({ row }) => formatDateOnly(new Date(row.original.date)) },
  {
    accessorKey: "description",
    header: "Descrição",
    cell: ({ row }) => (
      <div className="leading-tight">
        <Link href={`/ledger/${row.original.id}`} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:underline">
          {row.original.description}
        </Link>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          {row.original.type === "INCOME" ? "Receita" : "Despesa"}
          {row.original.recurring && <Repeat className="size-3" aria-label="recorrente" />}
          {row.original.attachments > 0 && <Paperclip className="size-3" aria-label={`${row.original.attachments} anexo(s)`} />}
        </div>
      </div>
    ),
  },
  { accessorKey: "category", header: "Categoria" },
  { accessorKey: "party", header: "Fornecedor / cliente", cell: ({ getValue }) => getValue<string | null>() ?? "—" },
  { accessorKey: "netCents", header: "s/ IVA", meta: { align: "right" }, cell: ({ row }) => signed(row.original, row.original.netCents) },
  {
    accessorKey: "vatCents",
    header: "IVA",
    meta: { align: "right" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {formatEUR(row.original.vatCents)} <span className="text-xs">({formatPercent(row.original.vatRateBp)})</span>
      </span>
    ),
  },
  { accessorKey: "grossCents", header: "c/ IVA", meta: { align: "right" }, cell: ({ row }) => signed(row.original, row.original.grossCents) },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ row }) =>
      row.original.status === "PAID" ? (
        <Badge variant="success">Pago</Badge>
      ) : (
        <div className="flex flex-wrap items-center gap-1">
          <Badge variant={row.original.overdue ? "destructive" : "warning"}>
            {row.original.overdue ? "Vencido" : "Pendente"}
            {row.original.dueDate && ` · ${formatDateOnly(new Date(row.original.dueDate))}`}
          </Badge>
          <MarkPaid id={row.original.id} />
        </div>
      ),
  },
];

export function TransactionsTable({ rows }: { rows: LedgerTableRow[] }) {
  return <DataTable columns={columns} data={rows} caption="Movimentos" emptyMessage="Sem movimentos neste período com estes filtros." pageSize={50} />;
}
