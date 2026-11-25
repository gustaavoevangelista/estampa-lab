"use client";

import { useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, useWatch, type Control, type UseFormRegister } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Field } from "@/components/form/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { applyFieldErrors } from "@/lib/form-errors";
import { formatEUR, formatPercent, parseEUR, parsePercentToBp } from "@/lib/money";
import { cn } from "@/lib/utils";
import { createProduct, updateProduct } from "./actions";
import {
  COST_ITEM_LABELS,
  costLineCents,
  economics,
  TECHNIQUE_LABELS,
  tierEconomics,
  type CostItemType,
} from "./costing";
import { EconomicsSummary } from "./economics-summary";
import { COST_ITEM_TYPES, emptyCostItem, emptyVariant, PRINT_TECHNIQUES, productFormSchema, type ProductFormInput, type ProductFormOutput } from "./schema";
import { WhatIfPricing } from "./what-if";

type Option = { id: string; name: string };
type FormControl = Control<ProductFormInput, unknown, ProductFormOutput>;

const cents = (v: string | undefined) => parseEUR(v ?? "") ?? 0;
const int = (v: string | undefined) => (/^\d+$/.test((v ?? "").trim()) ? Number(v) : null);

/** Parses the in-progress form leniently (invalid → 0) for the live preview. */
function useLivePreview(control: FormControl, labourRateCents: number, defaultWarningBp: number) {
  const values = useWatch({ control });
  return useMemo(() => {
    const lines = (values.costItems ?? []).map((c) => ({
      type: (c?.type ?? "OTHER") as CostItemType,
      unitCostNetCents: cents(c?.unitCostNetCents),
      labourMinutes: int(c?.labourMinutes) ?? 0,
      hourlyRateCents: c?.hourlyRateCents ? cents(c.hourlyRateCents) : null,
    }));
    const lineCosts = lines.map((l) => costLineCents(l, labourRateCents));
    const unitCost = lineCosts.reduce((a, b) => a + b, 0);
    const fixed = (values.fixedCosts ?? []).reduce((acc, f) => acc + cents(f?.amountNetCents), 0);
    const vatRateBp = parsePercentToBp(values.vatRateBp ?? "") ?? 2300;
    const marginWarningBp = parsePercentToBp(values.marginWarningBp ?? "") ?? defaultWarningBp;
    const e = economics({
      priceNetCents: cents(values.baseSalePriceNetCents),
      vatRateBp,
      unitCostCents: unitCost,
      fixedCostsCents: fixed,
      marginWarningBp,
    });
    const tiers = tierEconomics(
      (values.priceTiers ?? [])
        .filter((t) => int(t?.minQty) !== null)
        .map((t) => ({ minQty: int(t?.minQty)!, maxQty: int(t?.maxQty), unitPriceNetCents: cents(t?.unitPriceNetCents) })),
      { unitCostCents: unitCost, vatRateBp, fixedCostsCents: fixed, marginWarningBp },
    );
    return { e, lineCosts, fixed, vatRateBp, marginWarningBp, tiers };
  }, [values, labourRateCents, defaultWarningBp]);
}

function RemoveButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <Button type="button" variant="ghost" size="icon" onClick={onClick} aria-label={label}>
      <Trash2 className="text-destructive" aria-hidden="true" />
    </Button>
  );
}

function CostItemRow({
  index,
  control,
  register,
  suppliers,
  lineCost,
  error,
  onRemove,
}: {
  index: number;
  control: FormControl;
  register: UseFormRegister<ProductFormInput>;
  suppliers: Option[];
  lineCost: number;
  error?: { label?: { message?: string }; unitCostNetCents?: { message?: string }; labourMinutes?: { message?: string } };
  onRemove: () => void;
}) {
  const type = useWatch({ control, name: `costItems.${index}.type` });
  const p = `costItems.${index}` as const;
  return (
    <fieldset className="grid gap-3 rounded-lg border p-3 sm:grid-cols-6 sm:items-start">
      <legend className="sr-only">Linha de custo {index + 1}</legend>
      <Field id={`${p}.type`} label="Tipo" className="sm:col-span-2">
        <NativeSelect {...register(`${p}.type`)}>
          {COST_ITEM_TYPES.map((t) => (
            <option key={t} value={t}>
              {COST_ITEM_LABELS[t]}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <Field id={`${p}.label`} label="Descrição" required error={error?.label?.message} className="sm:col-span-4">
        <Input {...register(`${p}.label`)} />
      </Field>
      {type === "PRINT" && (
        <Field id={`${p}.technique`} label="Técnica" className="sm:col-span-2">
          <NativeSelect {...register(`${p}.technique`)}>
            <option value="">—</option>
            {PRINT_TECHNIQUES.map((t) => (
              <option key={t} value={t}>
                {TECHNIQUE_LABELS[t]}
              </option>
            ))}
          </NativeSelect>
        </Field>
      )}
      {type === "LABOUR" ? (
        <>
          <Field id={`${p}.labourMinutes`} label="Minutos por unidade" required error={error?.labourMinutes?.message} className="sm:col-span-2">
            <Input inputMode="numeric" {...register(`${p}.labourMinutes`)} />
          </Field>
          <Field id={`${p}.hourlyRateCents`} label="€/hora (vazio = definição)" className="sm:col-span-2">
            <Input inputMode="decimal" {...register(`${p}.hourlyRateCents`)} />
          </Field>
        </>
      ) : (
        <>
          <Field id={`${p}.unitCostNetCents`} label="Custo/un. (€ s/ IVA)" required error={error?.unitCostNetCents?.message} className="sm:col-span-2">
            <Input inputMode="decimal" placeholder="0,00" {...register(`${p}.unitCostNetCents`)} />
          </Field>
          <Field id={`${p}.supplierId`} label="Fornecedor" className="sm:col-span-2">
            <NativeSelect {...register(`${p}.supplierId`)}>
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
        </>
      )}
      <div className="flex items-center justify-between gap-2 sm:col-span-6">
        <span className="text-sm text-muted-foreground">
          Custo da linha: <span className="font-medium text-foreground tabular-nums">{formatEUR(lineCost)}</span>
        </span>
        <RemoveButton onClick={onRemove} label={`Remover linha de custo ${index + 1}`} />
      </div>
    </fieldset>
  );
}

export function ProductForm({
  productId,
  defaultValues,
  categories,
  suppliers,
  labourRateCents,
  marginWarningBp,
}: {
  productId?: string;
  defaultValues: ProductFormInput;
  categories: Option[];
  suppliers: Option[];
  labourRateCents: number;
  marginWarningBp: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const form = useForm<ProductFormInput, unknown, ProductFormOutput>({
    resolver: zodResolver(productFormSchema),
    defaultValues,
    mode: "onTouched",
  });
  const { register, control, formState, setError, setValue } = form;
  const errors = formState.errors;
  const costItems = useFieldArray({ control, name: "costItems" });
  const variants = useFieldArray({ control, name: "variants" });
  const fixedCosts = useFieldArray({ control, name: "fixedCosts" });
  const tiers = useFieldArray({ control, name: "priceTiers" });
  const live = useLivePreview(control, labourRateCents, marginWarningBp);

  const onSubmit = form.handleSubmit(
    () => {
      const values = form.getValues();
      startTransition(async () => {
        const res = productId ? await updateProduct(productId, values) : await createProduct(values);
        if (!res.ok) {
          applyFieldErrors(setError, res.fieldErrors);
          toast.error(res.error);
          return;
        }
        toast.success(res.message);
        router.push(`/products/${res.data!.id}`);
      });
    },
    () => toast.error("Verifique os campos assinalados."),
  );

  return (
    <form onSubmit={onSubmit} noValidate className="grid gap-6 xl:grid-cols-[1fr_22rem] xl:items-start">
      <div className="grid min-w-0 gap-6 [&>*]:min-w-0">
        <Card>
          <CardHeader>
            <CardTitle>Produto</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <Field id="name" label="Nome" required error={errors.name?.message}>
              <Input {...register("name")} />
            </Field>
            <Field id="sku" label="SKU" required error={errors.sku?.message}>
              <Input className="uppercase" {...register("sku")} />
            </Field>
            <Field id="categoryId" label="Categoria" required error={errors.categoryId?.message}>
              <NativeSelect {...register("categoryId")}>
                <option value="">Escolher…</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="supplierId" label="Fornecedor principal">
              <NativeSelect {...register("supplierId")}>
                <option value="">—</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field id="description" label="Descrição" className="sm:col-span-2">
              <Textarea rows={3} {...register("description")} />
            </Field>
            <div className="flex items-center gap-2">
              <input id="active" type="checkbox" className="size-4 accent-primary" {...register("active")} />
              <label htmlFor="active" className="text-sm font-medium">
                Produto ativo
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preço e IVA</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-3">
            <Field
              id="baseSalePriceNetCents"
              label="Preço de venda (€ s/ IVA)"
              required
              error={errors.baseSalePriceNetCents?.message}
              hint={`c/ IVA: ${formatEUR(live.e.priceGrossCents)}`}
            >
              <Input inputMode="decimal" placeholder="0,00" {...register("baseSalePriceNetCents")} />
            </Field>
            <Field id="vatRateBp" label="IVA (%)" required error={errors.vatRateBp?.message}>
              <Input inputMode="decimal" {...register("vatRateBp")} />
            </Field>
            <Field
              id="marginWarningBp"
              label="Alerta de margem (%)"
              error={errors.marginWarningBp?.message}
              hint={`Vazio = ${formatPercent(marginWarningBp)} (definições)`}
            >
              <Input inputMode="decimal" {...register("marginWarningBp")} />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custo por unidade</CardTitle>
            <CardDescription>
              Peça lisa, personalização, consumíveis, embalagem, mão de obra, quota de portes e outros. Valores sem IVA.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {costItems.fields.map((f, i) => (
              <CostItemRow
                key={f.id}
                index={i}
                control={control}
                register={register}
                suppliers={suppliers}
                lineCost={live.lineCosts[i] ?? 0}
                error={errors.costItems?.[i]}
                onRemove={() => costItems.remove(i)}
              />
            ))}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" size="sm" onClick={() => costItems.append({ ...emptyCostItem, type: "OTHER" })}>
                <Plus aria-hidden="true" /> Adicionar linha de custo
              </Button>
              <p className="text-sm">
                Total por unidade: <strong className="tabular-nums">{formatEUR(live.e.unitCostCents)}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Custos fixos / preparação</CardTitle>
            <CardDescription>Custos por trabalho (quadros de serigrafia, digitalização de bordado…). Usados no ponto de equilíbrio.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {fixedCosts.fields.map((f, i) => (
              <div key={f.id} className="grid gap-3 sm:grid-cols-[1fr_10rem_auto] sm:items-start">
                <Field id={`fixedCosts.${i}.label`} label="Descrição" required error={errors.fixedCosts?.[i]?.label?.message}>
                  <Input {...register(`fixedCosts.${i}.label`)} />
                </Field>
                <Field id={`fixedCosts.${i}.amountNetCents`} label="Valor (€ s/ IVA)" required error={errors.fixedCosts?.[i]?.amountNetCents?.message}>
                  <Input inputMode="decimal" {...register(`fixedCosts.${i}.amountNetCents`)} />
                </Field>
                <div className="sm:pt-6">
                  <RemoveButton onClick={() => fixedCosts.remove(i)} label={`Remover custo fixo ${i + 1}`} />
                </div>
              </div>
            ))}
            <div>
              <Button type="button" variant="outline" size="sm" onClick={() => fixedCosts.append({ label: "", amountNetCents: "" })}>
                <Plus aria-hidden="true" /> Adicionar custo fixo
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Escalões de quantidade</CardTitle>
            <CardDescription>Preço unitário por quantidade (ex.: 1–9, 10–49, 50+). Deixe o máximo vazio no último escalão.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {tiers.fields.map((f, i) => {
              const t = live.tiers.find((x) => x.minQty === int(form.getValues(`priceTiers.${i}.minQty`)));
              return (
                <div key={f.id} className="grid gap-3 sm:grid-cols-[6rem_6rem_9rem_1fr_auto] sm:items-start">
                  <Field id={`priceTiers.${i}.minQty`} label="De" required error={errors.priceTiers?.[i]?.minQty?.message}>
                    <Input inputMode="numeric" {...register(`priceTiers.${i}.minQty`)} />
                  </Field>
                  <Field id={`priceTiers.${i}.maxQty`} label="Até" error={errors.priceTiers?.[i]?.maxQty?.message}>
                    <Input inputMode="numeric" placeholder="∞" {...register(`priceTiers.${i}.maxQty`)} />
                  </Field>
                  <Field id={`priceTiers.${i}.unitPriceNetCents`} label="Preço/un. s/ IVA" required error={errors.priceTiers?.[i]?.unitPriceNetCents?.message}>
                    <Input inputMode="decimal" {...register(`priceTiers.${i}.unitPriceNetCents`)} />
                  </Field>
                  <div className="text-sm sm:pt-7" aria-live="polite">
                    {t && (
                      <span className={cn("tabular-nums", t.lowMargin && "font-medium text-destructive")}>
                        Margem {formatEUR(t.grossMarginCents)} · {formatPercent(t.marginBp)}
                      </span>
                    )}
                  </div>
                  <div className="sm:pt-6">
                    <RemoveButton onClick={() => tiers.remove(i)} label={`Remover escalão ${i + 1}`} />
                  </div>
                </div>
              );
            })}
            {errors.priceTiers?.message && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.priceTiers.message}
              </p>
            )}
            {errors.priceTiers?.root?.message && (
              <p role="alert" className="text-sm font-medium text-destructive">
                {errors.priceTiers.root.message}
              </p>
            )}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const last = form.getValues("priceTiers").at(-1);
                  const nextMin = last ? (int(last.maxQty) ?? int(last.minQty) ?? 0) + 1 : 1;
                  tiers.append({ minQty: String(nextMin), maxQty: "", unitPriceNetCents: "" });
                }}
              >
                <Plus aria-hidden="true" /> Adicionar escalão
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Variantes</CardTitle>
            <CardDescription>Tamanhos e cores. Preço vazio = preço base. Custo extra soma ao custo unitário (ex.: XXL).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            {variants.fields.map((f, i) => (
              <div key={f.id} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-[1.2fr_0.7fr_1fr_1fr_1fr_auto] sm:items-start">
                <input type="hidden" {...register(`variants.${i}.id`)} />
                <Field id={`variants.${i}.sku`} label="SKU" required error={errors.variants?.[i]?.sku?.message}>
                  <Input className="uppercase" {...register(`variants.${i}.sku`)} />
                </Field>
                <Field id={`variants.${i}.size`} label="Tamanho">
                  <Input {...register(`variants.${i}.size`)} />
                </Field>
                <Field id={`variants.${i}.colour`} label="Cor">
                  <Input {...register(`variants.${i}.colour`)} />
                </Field>
                <Field id={`variants.${i}.salePriceNetCents`} label="Preço s/ IVA" error={errors.variants?.[i]?.salePriceNetCents?.message}>
                  <Input inputMode="decimal" {...register(`variants.${i}.salePriceNetCents`)} />
                </Field>
                <Field id={`variants.${i}.extraCostNetCents`} label="Custo extra" error={errors.variants?.[i]?.extraCostNetCents?.message}>
                  <Input inputMode="decimal" {...register(`variants.${i}.extraCostNetCents`)} />
                </Field>
                <div className="sm:pt-6">
                  <RemoveButton onClick={() => variants.remove(i)} label={`Remover variante ${i + 1}`} />
                </div>
              </div>
            ))}
            <div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  const sku = form.getValues("sku");
                  variants.append({ ...emptyVariant, sku: sku ? `${sku}-` : "" });
                }}
              >
                <Plus aria-hidden="true" /> Adicionar variante
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {productId ? "Guardar alterações" : "Criar produto"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancelar
          </Button>
        </div>
      </div>

      <aside aria-label="Resumo de custos e margem" className="grid gap-4 xl:sticky xl:top-20">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
            <CardDescription>Atualiza enquanto escreve.</CardDescription>
          </CardHeader>
          <CardContent>
            <EconomicsSummary e={live.e} fixedCostsCents={live.fixed} marginWarningBp={live.marginWarningBp} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Simular preço</CardTitle>
          </CardHeader>
          <CardContent>
            <WhatIfPricing
              unitCostCents={live.e.unitCostCents}
              vatRateBp={live.vatRateBp}
              onApply={(v) => setValue("baseSalePriceNetCents", v, { shouldValidate: true, shouldDirty: true })}
            />
          </CardContent>
        </Card>
      </aside>
    </form>
  );
}
