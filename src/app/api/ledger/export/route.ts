import { auth } from "@/auth";
import { csvMoney, toCsv } from "@/features/ledger/csv";
import { parseLedgerFilters } from "@/features/ledger/filters";
import { listTransactions } from "@/features/ledger/queries";
import { PAYMENT_METHOD_LABELS } from "@/features/ledger/schema";
import { formatDateOnly, todayInLisbon, toISODateOnly } from "@/lib/dates";

/** CSV export of the ledger with the same filters as the page. */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return new Response("Não autorizado", { status: 401 });
  const params = Object.fromEntries(new URL(req.url).searchParams);
  const f = parseLedgerFilters(params, todayInLisbon());
  const rows = await listTransactions(f);
  const csv = toCsv(
    ["Data", "Tipo", "Descrição", "Categoria", "Subcategoria", "Valor s/ IVA", "Taxa IVA %", "IVA", "Valor c/ IVA", "Estado", "Vencimento", "Pagamento", "Fornecedor", "Cliente", "Produto", "Documento", "Notas"],
    rows.map((r) => {
      const parent = r.category.parent;
      return [
        formatDateOnly(r.date),
        r.type === "INCOME" ? "Receita" : "Despesa",
        r.description,
        parent ? parent.name : r.category.name,
        parent ? r.category.name : "",
        csvMoney(r.netCents),
        (r.vatRateBp / 100).toString().replace(".", ","),
        csvMoney(r.vatCents),
        csvMoney(r.grossCents),
        r.status === "PAID" ? "Pago" : "Pendente",
        r.dueDate ? formatDateOnly(r.dueDate) : "",
        r.paymentMethod ? PAYMENT_METHOD_LABELS[r.paymentMethod] : "",
        r.supplier?.name ?? "",
        r.customer?.name ?? "",
        r.product?.name ?? "",
        r.invoiceRef ?? "",
        r.notes ?? "",
      ];
    }),
  );
  const name = `movimentos_${toISODateOnly(f.from)}_${toISODateOnly(f.to)}.csv`;
  return new Response(csv, {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${name}"` },
  });
}
