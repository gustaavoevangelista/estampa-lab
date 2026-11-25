"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { todayInLisbon } from "@/lib/dates";
import { fromGross, fromNet } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES, newStorageKey, storage } from "@/lib/storage";
import { fieldErrors } from "@/lib/validation";
import { generateDueRecurringEntries } from "./recurring";
import {
  categoryFormSchema,
  recurringFormSchema,
  transactionFormSchema,
  type CategoryFormInput,
  type RecurringFormInput,
  type TransactionFormInput,
  type TransactionFormOutput,
} from "./schema";

const INVALID = "Verifique os campos assinalados.";

function revalidateLedger() {
  revalidatePath("/ledger", "layout");
  revalidatePath("/");
}

async function toData(d: TransactionFormOutput) {
  const amounts = d.amountMode === "NET" ? fromNet(d.amount, d.vatRateBp) : fromGross(d.amount, d.vatRateBp);
  const category = await prisma.transactionCategory.findUnique({ where: { id: d.categoryId } });
  if (!category || category.type !== d.type) return { error: { categoryId: ["A categoria não corresponde ao tipo de movimento."] } };
  let customerId: string | null = null;
  if (d.customerName) {
    const existing = await prisma.customer.findFirst({ where: { name: d.customerName, deletedAt: null } });
    customerId = (existing ?? (await prisma.customer.create({ data: { name: d.customerName } }))).id;
  }
  return {
    data: {
      type: d.type,
      date: d.date,
      dueDate: d.dueDate,
      status: d.status,
      paidAt: d.status === "PAID" ? d.date : null,
      netCents: amounts.netCents,
      vatRateBp: d.vatRateBp,
      vatCents: amounts.vatCents,
      grossCents: amounts.grossCents,
      description: d.description,
      categoryId: d.categoryId,
      paymentMethod: d.paymentMethod,
      supplierId: d.supplierId,
      customerId,
      productId: d.productId,
      invoiceRef: d.invoiceRef,
      notes: d.notes,
    },
  };
}

async function saveAttachments(transactionId: string, files: File[]): Promise<string | null> {
  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (!ALLOWED_UPLOAD_TYPES[file.type]) return "Formato não suportado. Use PDF, JPG, PNG, WEBP ou HEIC.";
    if (file.size > MAX_UPLOAD_BYTES) return "Ficheiro demasiado grande (máximo 10 MB).";
  }
  for (const file of files) {
    if (!file || file.size === 0) continue;
    const key = newStorageKey("transactions", file.type);
    await storage().put(key, Buffer.from(await file.arrayBuffer()), file.type);
    await prisma.attachment.create({
      data: { storageKey: key, originalName: file.name.slice(0, 190), mimeType: file.type, sizeBytes: file.size, transactionId },
    });
  }
  return null;
}

/** FormData: "values" (JSON of TransactionFormInput) + zero or more "files". */
function readForm(formData: FormData): { values: TransactionFormInput; files: File[] } {
  return {
    values: JSON.parse(String(formData.get("values") ?? "{}")) as TransactionFormInput,
    files: formData.getAll("files").filter((f): f is File => f instanceof File),
  };
}

export async function createTransaction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  const user = await requireUser();
  const { values, files } = readForm(formData);
  const parsed = transactionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const built = await toData(parsed.data);
  if ("error" in built) return { ok: false, error: INVALID, fieldErrors: built.error };
  const tx = await prisma.transaction.create({ data: { ...built.data!, createdById: user.id } });
  const uploadError = await saveAttachments(tx.id, files);
  revalidateLedger();
  if (uploadError) return { ok: true, data: { id: tx.id }, message: `Movimento guardado, mas o anexo falhou: ${uploadError}` };
  return { ok: true, data: { id: tx.id }, message: "Movimento registado." };
}

export async function updateTransaction(id: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const { values, files } = readForm(formData);
  const parsed = transactionFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const built = await toData(parsed.data);
  if ("error" in built) return { ok: false, error: INVALID, fieldErrors: built.error };
  const { count } = await prisma.transaction.updateMany({ where: { id, deletedAt: null }, data: built.data! });
  if (count === 0) return { ok: false, error: "Movimento não encontrado." };
  const uploadError = await saveAttachments(id, files);
  revalidateLedger();
  if (uploadError) return { ok: true, data: { id }, message: `Alterações guardadas, mas o anexo falhou: ${uploadError}` };
  return { ok: true, data: { id }, message: "Alterações guardadas." };
}

export async function deleteTransaction(id: string): Promise<ActionResult> {
  await requireUser();
  const { count } = await prisma.transaction.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: new Date() } });
  if (count === 0) return { ok: false, error: "Movimento não encontrado." };
  revalidateLedger();
  return { ok: true, message: "Movimento eliminado." };
}

export async function markTransactionPaid(id: string): Promise<ActionResult> {
  await requireUser();
  const tx = await prisma.transaction.findFirst({ where: { id, deletedAt: null } });
  if (!tx) return { ok: false, error: "Movimento não encontrado." };
  await prisma.transaction.update({ where: { id }, data: { status: "PAID", paidAt: todayInLisbon() } });
  revalidateLedger();
  return { ok: true, message: "Marcado como pago." };
}

export async function deleteAttachment(id: string): Promise<ActionResult> {
  await requireUser();
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return { ok: false, error: "Anexo não encontrado." };
  await prisma.attachment.delete({ where: { id } });
  await storage().delete(att.storageKey);
  revalidateLedger();
  return { ok: true, message: "Anexo removido." };
}

// ─────────────── Recurring expenses ───────────────

export async function saveRecurring(id: string | null, input: RecurringFormInput): Promise<ActionResult> {
  await requireUser();
  const parsed = recurringFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.endDate && d.endDate < d.startDate) return { ok: false, error: INVALID, fieldErrors: { endDate: ["A data de fim é anterior ao início."] } };
  if (id) {
    const existing = await prisma.recurringExpense.findUnique({ where: { id } });
    if (!existing) return { ok: false, error: "Despesa recorrente não encontrada." };
    // Changing the start date restarts the schedule from there; otherwise keep where it was.
    const nextRunDate = existing.startDate.getTime() === d.startDate.getTime() ? existing.nextRunDate : d.startDate;
    await prisma.recurringExpense.update({ where: { id }, data: { ...d, nextRunDate } });
  } else {
    await prisma.recurringExpense.create({ data: { ...d, nextRunDate: d.startDate } });
  }
  await generateDueRecurringEntries();
  revalidateLedger();
  return { ok: true, message: "Despesa recorrente guardada." };
}

export async function deleteRecurring(id: string): Promise<ActionResult> {
  await requireUser();
  // Keeps generated entries; they just lose the link.
  await prisma.$transaction([
    prisma.transaction.updateMany({ where: { recurringId: id }, data: { recurringId: null } }),
    prisma.recurringExpense.delete({ where: { id } }),
  ]);
  revalidateLedger();
  return { ok: true, message: "Despesa recorrente removida. Os movimentos já criados foram mantidos." };
}

// ─────────────── Categories ───────────────

export async function createCategory(input: CategoryFormInput): Promise<ActionResult> {
  await requireUser();
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.parentId) {
    const parent = await prisma.transactionCategory.findUnique({ where: { id: d.parentId } });
    if (!parent || parent.parentId || parent.type !== d.type) return { ok: false, error: "Categoria principal inválida." };
  }
  const dup = await prisma.transactionCategory.findFirst({ where: { type: d.type, parentId: d.parentId, name: d.name } });
  if (dup) return { ok: false, error: INVALID, fieldErrors: { name: ["Já existe uma categoria com esse nome."] } };
  await prisma.transactionCategory.create({ data: d });
  revalidateLedger();
  return { ok: true, message: "Categoria criada." };
}

export async function renameCategory(id: string, name: string): Promise<ActionResult> {
  await requireUser();
  const clean = name.trim();
  if (!clean || clean.length > 80) return { ok: false, error: "Nome inválido." };
  await prisma.transactionCategory.update({ where: { id }, data: { name: clean } });
  revalidateLedger();
  return { ok: true, message: "Categoria atualizada." };
}

export async function deleteCategory(id: string): Promise<ActionResult> {
  await requireUser();
  const [used, children, recurring] = await Promise.all([
    prisma.transaction.count({ where: { categoryId: id } }),
    prisma.transactionCategory.count({ where: { parentId: id } }),
    prisma.recurringExpense.count({ where: { categoryId: id } }),
  ]);
  if (used || children || recurring) {
    return { ok: false, error: "Não é possível eliminar: a categoria tem movimentos, subcategorias ou despesas recorrentes." };
  }
  await prisma.transactionCategory.delete({ where: { id } });
  revalidateLedger();
  return { ok: true, message: "Categoria eliminada." };
}
