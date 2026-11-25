"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/lib/form-errors";
import { formatEUR, fromGross, fromNet, parseEUR, parsePercentToBp } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createTransaction, updateTransaction } from "./actions";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, transactionFormSchema, type TransactionFormInput, type TransactionFormOutput } from "./schema";

type CategoryOption = { id: string; label: string; type: string; depth: number };

export function TransactionForm({
  transactionId,
  defaultValues,
  categories,
  suppliers,
  customers,
  products,
}: {
  transactionId?: string;
  defaultValues: TransactionFormInput;
  categories: CategoryOption[];
  suppliers: { id: string; name: string }[];
  customers: { id: string; name: string }[];
  products: { id: string; name: string; sku: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const form = useForm<TransactionFormInput, unknown, TransactionFormOutput>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, control, formState, setError, setValue } = form;
  const e = formState.errors;
  const [type, amountMode, amount, vat, status] = useWatch({ control, name: ["type", "amountMode", "amount", "vatRateBp", "status"] });

  const cents = parseEUR(amount ?? "");
  const bp = parsePercentToBp(vat ?? "");
  const preview = cents !== null && cents >= 0 && bp !== null ? (amountMode === "NET" ? fromNet(cents, bp) : fromGross(cents, bp)) : null;

  const onSubmit = form.handleSubmit(
    () => {
      const fd = new FormData();
      fd.set("values", JSON.stringify(form.getValues()));
      for (const f of Array.from(fileRef.current?.files ?? [])) fd.append("files", f);
      startTransition(async () => {
        const res = transactionId ? await updateTransaction(transactionId, fd) : await createTransaction(fd);
        if (!res.ok) {
          applyFieldErrors(setError, res.fieldErrors);
          toast.error(res.error);
          return;
        }
        toast.success(res.message);
        router.push(transactionId ? `/ledger/${transactionId}` : "/ledger");
        router.refresh();
      });
    },
    () => toast.error("Verifique os campos assinalados."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-4xl gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Movimento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <fieldset className="sm:col-span-2">
            <legend className="mb-1.5 text-sm font-medium">Tipo</legend>
            <div className="inline-flex rounded-lg border bg-muted p-1" role="radiogroup">
              {(["EXPENSE", "INCOME"] as const).map((t) => (
                <label
                  key={t}
                  className={cn(
                    "cursor-pointer rounded-md px-4 py-1.5 text-sm font-medium has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring",
                    type === t ? "bg-card shadow-xs" : "text-muted-foreground",
                  )}
                >
                  <input
                    type="radio"
                    value={t}
                    className="sr-only"
                    {...register("type", { onChange: () => setValue("categoryId", "") })}
                  />
                  {t === "EXPENSE" ? "Despesa" : "Receita"}
                </label>
              ))}
            </div>
          </fieldset>
          <Field id="description" label="Descrição" required error={e.description?.message} className="sm:col-span-2">
            <Input {...register("description")} />
          </Field>
          <Field id="categoryId" label="Categoria" required error={e.categoryId?.message}>
            <NativeSelect {...register("categoryId")}>
              <option value="">Escolher…</option>
              {categories
                .filter((c) => c.type === type)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.depth ? `   ${c.label}` : c.label}
                  </option>
                ))}
            </NativeSelect>
          </Field>
          <Field id="date" label="Data" required error={e.date?.message}>
            <Input type="date" {...register("date")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Valor e IVA</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <fieldset className="sm:col-span-3">
            <legend className="mb-1.5 text-sm font-medium">O valor indicado é</legend>
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="radio" value="GROSS" className="accent-primary" {...register("amountMode")} /> com IVA (total do documento)
              </label>
              <label className="flex items-center gap-2">
                <input type="radio" value="NET" className="accent-primary" {...register("amountMode")} /> sem IVA
              </label>
            </div>
          </fieldset>
          <Field id="amount" label={amountMode === "NET" ? "Valor s/ IVA (€)" : "Valor c/ IVA (€)"} required error={e.amount?.message}>
            <Input inputMode="decimal" placeholder="0,00" {...register("amount")} />
          </Field>
          <Field id="vatRateBp" label="Taxa de IVA (%)" required error={e.vatRateBp?.message} hint="23, 13, 6 ou 0 (isento).">
            <Input inputMode="decimal" list="vat-rates" {...register("vatRateBp")} />
          </Field>
          <datalist id="vat-rates">
            {["23", "13", "6", "0"].map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
          <div aria-live="polite" className="rounded-lg bg-muted p-3 text-sm">
            {preview ? (
              <dl className="grid grid-cols-2 gap-1 tabular-nums">
                <dt className="text-muted-foreground">s/ IVA</dt>
                <dd className="text-right">{formatEUR(preview.netCents)}</dd>
                <dt className="text-muted-foreground">IVA</dt>
                <dd className="text-right">{formatEUR(preview.vatCents)}</dd>
                <dt className="font-medium">c/ IVA</dt>
                <dd className="text-right font-semibold">{formatEUR(preview.grossCents)}</dd>
              </dl>
            ) : (
              <span className="text-muted-foreground">Indique valor e taxa para ver a decomposição.</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Pagamento</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field id="status" label="Estado" required>
            <NativeSelect {...register("status")}>
              <option value="PAID">{type === "INCOME" ? "Recebido" : "Pago"}</option>
              <option value="PENDING">Pendente</option>
            </NativeSelect>
          </Field>
          <Field id="dueDate" label="Vencimento" error={e.dueDate?.message} hint={status === "PENDING" ? "Usado nos alertas de pagamentos em atraso." : undefined}>
            <Input type="date" {...register("dueDate")} />
          </Field>
          <Field id="paymentMethod" label="Meio de pagamento">
            <NativeSelect {...register("paymentMethod")}>
              <option value="">—</option>
              {PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {PAYMENT_METHOD_LABELS[m]}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ligações e documentos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="supplierId" label="Fornecedor">
            <NativeSelect {...register("supplierId")}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="customerName" label="Cliente" error={e.customerName?.message} hint="Escreva um nome novo para criar o cliente.">
            <Input list="customer-names" autoComplete="off" {...register("customerName")} />
          </Field>
          <datalist id="customer-names">
            {customers.map((c) => (
              <option key={c.id} value={c.name} />
            ))}
          </datalist>
          <Field id="productId" label="Produto">
            <NativeSelect {...register("productId")}>
              <option value="">—</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.sku})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="invoiceRef" label="N.º do documento" error={e.invoiceRef?.message} hint="Fatura, recibo ou FT 2026/123.">
            <Input {...register("invoiceRef")} />
          </Field>
          <Field id="files" label="Anexar fatura / recibo" hint="PDF ou imagem, até 10 MB cada." className="sm:col-span-2">
            <Input ref={fileRef} type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp,image/heic" />
          </Field>
          <Field id="notes" label="Notas" error={e.notes?.message} className="sm:col-span-2">
            <Textarea rows={3} {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {transactionId ? "Guardar alterações" : "Registar movimento"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
