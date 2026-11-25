"use client";

import { useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { applyFieldErrors } from "@/lib/form-errors";
import { updateSettings } from "./actions";
import { settingsFormSchema, type SettingsFormInput } from "./schema";

export function SettingsForm({ defaultValues }: { defaultValues: SettingsFormInput }) {
  const [pending, startTransition] = useTransition();
  const form = useForm({ resolver: zodResolver(settingsFormSchema), defaultValues });
  const { register, formState, setError } = form;

  const onSubmit = form.handleSubmit(() => {
    const values = form.getValues();
    startTransition(async () => {
      const res = await updateSettings(values);
      if (!res.ok) {
        applyFieldErrors(setError, res.fieldErrors);
        toast.error(res.error);
        return;
      }
      toast.success(res.message);
    });
  });

  return (
    <form onSubmit={onSubmit} noValidate className="grid max-w-xl gap-4">
      <Field id="defaultVatRateBp" label="Taxa de IVA por defeito (%)" required error={formState.errors.defaultVatRateBp?.message} hint="Usada em novos produtos e movimentos.">
        <Input inputMode="decimal" {...register("defaultVatRateBp")} />
      </Field>
      <Field id="marginWarningBp" label="Alerta de margem baixa abaixo de (%)" required error={formState.errors.marginWarningBp?.message} hint="Cada produto pode definir o seu próprio limite.">
        <Input inputMode="decimal" {...register("marginWarningBp")} />
      </Field>
      <Field id="labourHourlyRateCents" label="Custo da mão de obra (€/hora)" required error={formState.errors.labourHourlyRateCents?.message} hint="Usado nas linhas de mão de obra sem valor próprio.">
        <Input inputMode="decimal" {...register("labourHourlyRateCents")} />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
          Guardar
        </Button>
      </div>
    </form>
  );
}
