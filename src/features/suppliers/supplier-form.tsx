"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
import { createSupplier, updateSupplier } from "./actions";
import { supplierFormSchema, type SupplierFormInput, type SupplierFormOutput } from "./schema";

export function SupplierForm({
  supplierId,
  defaultValues,
  categories,
}: {
  supplierId?: string;
  defaultValues: SupplierFormInput;
  categories: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<SupplierFormInput, unknown, SupplierFormOutput>({
    resolver: zodResolver(supplierFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, formState, setError } = form;
  const err = (k: keyof SupplierFormInput) => formState.errors[k]?.message;

  const onSubmit = form.handleSubmit(() => {
    // Send the raw strings: the server re-validates with the same schema.
    const values = form.getValues();
    startTransition(async () => {
      const res = supplierId ? await updateSupplier(supplierId, values) : await createSupplier(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      router.push(`/suppliers/${res.data!.id}`);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Identificação</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="name" label="Nome" required error={err("name")}>
            <Input autoFocus {...register("name")} />
          </Field>
          <Field id="categoryId" label="Categoria" required error={err("categoryId")}>
            <NativeSelect {...register("categoryId")}>
              <option value="">Escolher…</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field id="vatNumber" label="NIF / NIPC" error={err("vatNumber")} hint="Validado para fornecedores em Portugal.">
            <Input inputMode="numeric" autoComplete="off" {...register("vatNumber")} />
          </Field>
          <Field id="rating" label="Avaliação" error={err("rating")}>
            <NativeSelect {...register("rating")}>
              <option value="">Sem avaliação</option>
              {[5, 4, 3, 2, 1].map((n) => (
                <option key={n} value={String(n)}>
                  {"★".repeat(n)} ({n})
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex items-center gap-2 sm:col-span-2">
            <input id="active" type="checkbox" className="size-4 accent-primary" {...register("active")} />
            <label htmlFor="active" className="text-sm font-medium">
              Fornecedor ativo
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Contactos e morada</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="contactName" label="Pessoa de contacto" error={err("contactName")}>
            <Input autoComplete="off" {...register("contactName")} />
          </Field>
          <Field id="email" label="Email" error={err("email")}>
            <Input type="email" autoComplete="off" {...register("email")} />
          </Field>
          <Field id="phone" label="Telefone" error={err("phone")}>
            <Input type="tel" autoComplete="off" {...register("phone")} />
          </Field>
          <Field id="website" label="Website" error={err("website")}>
            <Input inputMode="url" placeholder="www.exemplo.pt" {...register("website")} />
          </Field>
          <Field id="addressLine" label="Morada" error={err("addressLine")} className="sm:col-span-2">
            <Input {...register("addressLine")} />
          </Field>
          <Field id="postalCode" label="Código postal" error={err("postalCode")}>
            <Input placeholder="1234-567" {...register("postalCode")} />
          </Field>
          <Field id="city" label="Localidade" error={err("city")}>
            <Input {...register("city")} />
          </Field>
          <Field id="country" label="País (código)" required error={err("country")}>
            <Input maxLength={2} className="uppercase" {...register("country")} />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Condições comerciais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <Field id="paymentTermsDays" label="Prazo de pagamento (dias)" error={err("paymentTermsDays")}>
            <Input inputMode="numeric" {...register("paymentTermsDays")} />
          </Field>
          <Field id="leadTimeDays" label="Prazo de entrega (dias)" error={err("leadTimeDays")}>
            <Input inputMode="numeric" {...register("leadTimeDays")} />
          </Field>
          <Field id="minOrderNetCents" label="Encomenda mínima (€, s/ IVA)" error={err("minOrderNetCents")}>
            <Input inputMode="decimal" placeholder="0,00" {...register("minOrderNetCents")} />
          </Field>
          <Field id="notes" label="Notas" error={err("notes")} className="sm:col-span-3">
            <Textarea rows={4} {...register("notes")} />
          </Field>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          {supplierId ? "Guardar alterações" : "Criar fornecedor"}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancelar
        </Button>
      </div>
    </form>
  );
}
