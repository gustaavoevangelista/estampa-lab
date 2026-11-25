"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { applyFieldErrors } from "@/lib/form-errors";
import { saveRecurring } from "./actions";
import { FREQUENCY_LABELS, type Frequency } from "./recurrence";
import { PAYMENT_METHOD_LABELS, PAYMENT_METHODS, recurringFormSchema, type RecurringFormInput } from "./schema";

export function RecurringForm({
  id,
  defaultValues,
  categories,
  suppliers,
}: {
  id: string | null;
  defaultValues: RecurringFormInput;
  categories: { id: string; label: string; depth: number }[];
  suppliers: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const form = useForm({ resolver: zodResolver(recurringFormSchema), defaultValues });
  const { register, formState, setError } = form;
  const e = formState.errors;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    start(async () => {
      const res = await saveRecurring(id, values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push("/ledger/recurring");
      router.refresh();
      if (!id) form.reset(defaultValues);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <Field id="r-description" label="Descrição" required error={e.description?.message} className="sm:col-span-2">
        <Input placeholder="ex.: Renda do armazém" {...register("description")} />
      </Field>
      <Field id="r-netCents" label="Valor s/ IVA (€)" required error={e.netCents?.message}>
        <Input inputMode="decimal" {...register("netCents")} />
      </Field>
      <Field id="r-vatRateBp" label="IVA (%)" required error={e.vatRateBp?.message}>
        <Input inputMode="decimal" {...register("vatRateBp")} />
      </Field>
      <Field id="r-categoryId" label="Categoria" required error={e.categoryId?.message}>
        <NativeSelect {...register("categoryId")}>
          <option value="">Escolher…</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.depth ? `   ${c.label}` : c.label}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="r-supplierId" label="Fornecedor">
        <NativeSelect {...register("supplierId")}>
          <option value="">—</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="r-paymentMethod" label="Meio de pagamento">
        <NativeSelect {...register("paymentMethod")}>
          <option value="">—</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_METHOD_LABELS[m]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <div className="grid grid-cols-[1fr_5rem] gap-2">
        <Field id="r-frequency" label="Repete">
          <NativeSelect {...register("frequency")}>
            {(Object.keys(FREQUENCY_LABELS) as Frequency[]).map((f) => (
              <option key={f} value={f}>
                {FREQUENCY_LABELS[f]}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field id="r-interval" label="Cada" error={e.interval?.message}>
          <Input inputMode="numeric" {...register("interval")} />
        </Field>
      </div>
      <Field id="r-startDate" label="Primeira data" required error={e.startDate?.message}>
        <Input type="date" {...register("startDate")} />
      </Field>
      <Field id="r-endDate" label="Termina em" error={e.endDate?.message} hint="Vazio = sem fim.">
        <Input type="date" {...register("endDate")} />
      </Field>
      <div className="flex items-center gap-2 lg:pt-6">
        <input id="r-active" type="checkbox" className="size-4 accent-primary" {...register("active")} />
        <label htmlFor="r-active" className="text-sm font-medium">
          Ativa
        </label>
      </div>
      <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-4">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {id ? "Guardar alterações" : "Adicionar despesa recorrente"}
        </Button>
        {id && (
          <Button type="button" variant="outline" onClick={() => router.push("/ledger/recurring")}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
