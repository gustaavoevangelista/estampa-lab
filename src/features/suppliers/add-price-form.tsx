"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { toISODateOnly, todayInLisbon } from "@/lib/dates";
import { applyFieldErrors } from "@/lib/form-errors";
import { addSupplierPrice } from "./actions";
import { supplierPriceFormSchema, type SupplierPriceFormInput } from "./schema";

export function AddPriceForm({
  supplierId,
  products,
  itemNames,
}: {
  supplierId: string;
  products: { id: string; name: string; sku: string }[];
  itemNames: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const defaults: SupplierPriceFormInput = {
    supplierId,
    itemName: "",
    productId: "",
    unitCostNetCents: "",
    validFrom: toISODateOnly(todayInLisbon()),
    notes: "",
  };
  const form = useForm({ resolver: zodResolver(supplierPriceFormSchema), defaultValues: defaults });
  const { register, formState, setError } = form;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const res = await addSupplierPrice(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
      form.reset({ ...defaults, validFrom: values.validFrom });
      router.refresh();
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.5fr_1.2fr_8rem_10rem_auto] lg:items-start">
      <Field id="price-itemName" label="Artigo" required error={formState.errors.itemName?.message}>
        <Input list="price-item-names" placeholder="ex.: T-shirt 150 g branca" {...register("itemName")} />
      </Field>
      <datalist id="price-item-names">
        {itemNames.map((n) => (
          <option key={n} value={n} />
        ))}
      </datalist>
      <Field id="price-productId" label="Produto (opcional)" error={formState.errors.productId?.message}>
        <NativeSelect {...register("productId")}>
          <option value="">—</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku})
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id="price-cost" label="Custo (€ s/ IVA)" required error={formState.errors.unitCostNetCents?.message}>
        <Input inputMode="decimal" placeholder="0,00" {...register("unitCostNetCents")} />
      </Field>
      <Field id="price-validFrom" label="Desde" required error={formState.errors.validFrom?.message}>
        <Input type="date" {...register("validFrom")} />
      </Field>
      <div className="flex items-end lg:pt-[1.375rem]">
        <Button type="submit" disabled={pending} variant="secondary">
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Plus aria-hidden="true" />}
          Registar preço
        </Button>
      </div>
    </form>
  );
}
