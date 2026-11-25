"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fieldErrors } from "@/lib/validation";
import {
  supplierFormSchema,
  supplierPriceFormSchema,
  type SupplierFormInput,
  type SupplierPriceFormInput,
} from "./schema";

const INVALID = "Verifique os campos assinalados.";

export async function createSupplier(input: SupplierFormInput): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = supplierFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const supplier = await prisma.supplier.create({ data: parsed.data });
  revalidatePath("/suppliers");
  return { ok: true, data: { id: supplier.id }, message: "Fornecedor criado." };
}

export async function updateSupplier(id: string, input: SupplierFormInput): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = supplierFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const { count } = await prisma.supplier.updateMany({ where: { id, deletedAt: null }, data: parsed.data });
  if (count === 0) return { ok: false, error: "Fornecedor não encontrado." };
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
  return { ok: true, data: { id }, message: "Alterações guardadas." };
}

/** Soft delete: keeps history (expenses, prices) intact. */
export async function deleteSupplier(id: string): Promise<ActionResult> {
  await requireUser();
  const { count } = await prisma.supplier.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date(), active: false },
  });
  if (count === 0) return { ok: false, error: "Fornecedor não encontrado." };
  revalidatePath("/suppliers");
  return { ok: true, message: "Fornecedor eliminado." };
}

export async function addSupplierPrice(input: SupplierPriceFormInput): Promise<ActionResult> {
  await requireUser();
  const parsed = supplierPriceFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const supplier = await prisma.supplier.findFirst({ where: { id: parsed.data.supplierId, deletedAt: null } });
  if (!supplier) return { ok: false, error: "Fornecedor não encontrado." };
  await prisma.supplierPrice.create({ data: parsed.data });
  revalidatePath(`/suppliers/${parsed.data.supplierId}`);
  return { ok: true, message: "Preço registado." };
}

export async function deleteSupplierPrice(id: string): Promise<ActionResult> {
  await requireUser();
  const price = await prisma.supplierPrice.delete({ where: { id } }).catch(() => null);
  if (!price) return { ok: false, error: "Registo não encontrado." };
  revalidatePath(`/suppliers/${price.supplierId}`);
  return { ok: true, message: "Registo removido." };
}
