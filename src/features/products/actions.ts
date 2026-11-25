"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";

import type { ActionResult } from "@/lib/action-result";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { fieldErrors } from "@/lib/validation";
import { productFormSchema, type ProductFormInput, type ProductFormOutput } from "./schema";

const INVALID = "Verifique os campos assinalados.";

function childData(data: ProductFormOutput) {
  return {
    costItems: data.costItems.map((c, i) => ({ ...c, sortOrder: i })),
    fixedCosts: data.fixedCosts,
    priceTiers: data.priceTiers,
  };
}

function productFields(data: ProductFormOutput) {
  const { name, sku, categoryId, supplierId, description, baseSalePriceNetCents, vatRateBp, marginWarningBp, active } = data;
  return { name, sku, categoryId, supplierId, description, baseSalePriceNetCents, vatRateBp, marginWarningBp, active };
}

function uniqueError(e: unknown): ActionResult<{ id: string }> | null {
  if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
    return { ok: false, error: "Já existe um produto ou variante com esse SKU.", fieldErrors: { sku: ["SKU já existe."] } };
  }
  return null;
}

export async function createProduct(input: ProductFormInput): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const children = childData(d);
  try {
    const product = await prisma.product.create({
      data: {
        ...productFields(d),
        variants: { create: d.variants.map((v) => ({ ...v, id: undefined })) },
        costItems: { create: children.costItems },
        fixedCosts: { create: children.fixedCosts },
        priceTiers: { create: children.priceTiers },
      },
    });
    revalidatePath("/products");
    return { ok: true, data: { id: product.id }, message: "Produto criado." };
  } catch (e) {
    const err = uniqueError(e);
    if (err) return err;
    throw e;
  }
}

export async function updateProduct(id: string, input: ProductFormInput): Promise<ActionResult<{ id: string }>> {
  await requireUser();
  const parsed = productFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: INVALID, fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  const existing = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: { variants: { select: { id: true } } } });
  if (!existing) return { ok: false, error: "Produto não encontrado." };

  const keepVariantIds = d.variants.map((v) => v.id).filter((v): v is string => !!v);
  const children = childData(d);
  try {
    await prisma.$transaction([
      prisma.product.update({ where: { id }, data: productFields(d) }),
      // Variants keep their ids (price history may point at them); the rest is replaced.
      prisma.productVariant.deleteMany({ where: { productId: id, id: { notIn: keepVariantIds } } }),
      ...d.variants.map(({ id: variantId, ...v }) =>
        variantId && existing.variants.some((ev) => ev.id === variantId)
          ? prisma.productVariant.update({ where: { id: variantId }, data: v })
          : prisma.productVariant.create({ data: { ...v, productId: id } }),
      ),
      prisma.productCostItem.deleteMany({ where: { productId: id } }),
      prisma.productCostItem.createMany({ data: children.costItems.map((c) => ({ ...c, productId: id })) }),
      prisma.productFixedCost.deleteMany({ where: { productId: id } }),
      prisma.productFixedCost.createMany({ data: children.fixedCosts.map((f) => ({ ...f, productId: id })) }),
      prisma.productPriceTier.deleteMany({ where: { productId: id } }),
      prisma.productPriceTier.createMany({ data: children.priceTiers.map((t) => ({ ...t, productId: id })) }),
    ]);
  } catch (e) {
    const err = uniqueError(e);
    if (err) return err;
    throw e;
  }
  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { ok: true, data: { id }, message: "Alterações guardadas." };
}

/**
 * Soft delete. SKUs get a suffix so they can be reused by a new product
 * (the unique index would otherwise block it).
 */
export async function deleteProduct(id: string): Promise<ActionResult> {
  await requireUser();
  const product = await prisma.product.findFirst({ where: { id, deletedAt: null }, include: { variants: true } });
  if (!product) return { ok: false, error: "Produto não encontrado." };
  const suffix = `~del-${Date.now().toString(36)}`;
  await prisma.$transaction([
    prisma.product.update({ where: { id }, data: { deletedAt: new Date(), active: false, sku: product.sku + suffix } }),
    ...product.variants.map((v) => prisma.productVariant.update({ where: { id: v.id }, data: { sku: v.sku + suffix } })),
  ]);
  revalidatePath("/products");
  return { ok: true, message: "Produto eliminado." };
}
