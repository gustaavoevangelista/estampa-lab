/**
 * Shared Zod building blocks. Form values arrive as strings (from inputs);
 * these helpers turn them into typed values (cents, basis points, null) with pt-PT messages.
 */
import { z } from "zod";

import { parseEUR, parsePercentToBp } from "@/lib/money";
import { parseDateOnly } from "@/lib/dates";

z.config(z.locales.pt());

const REQUIRED = "Campo obrigatório.";

/** Trimmed text; empty → null. */
export const optionalText = (max = 255) =>
  z
    .string()
    .trim()
    .max(max, `Máximo de ${max} caracteres.`)
    .transform((v) => (v === "" ? null : v));

export const requiredText = (max = 255) =>
  z.string().trim().min(1, REQUIRED).max(max, `Máximo de ${max} caracteres.`);

export const optionalEmail = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.toLowerCase()))
  .refine((v) => v === null || z.email().safeParse(v).success, "Email inválido.");

export const optionalUrl = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : /^https?:\/\//i.test(v) ? v : `https://${v}`))
  .refine((v) => v === null || z.url().safeParse(v).success, "Endereço web inválido.");

/** "1 234,56" → 123456. Required. */
export const moneyRequired = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((v, ctx) => {
    const cents = parseEUR(v);
    if (cents === null) {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Use, por exemplo, 12,50." });
      return z.NEVER;
    }
    return cents;
  });

export const moneyRequiredNonNegative = moneyRequired.refine((v) => v >= 0, "O valor não pode ser negativo.");

/** Empty → null. */
export const moneyOptional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const cents = parseEUR(v);
    if (cents === null || cents < 0) {
      ctx.addIssue({ code: "custom", message: "Valor inválido. Use, por exemplo, 12,50." });
      return z.NEVER;
    }
    return cents;
  });

/** "23" / "6,5" → basis points. */
export const percentRequired = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((v, ctx) => {
    const bp = parsePercentToBp(v);
    if (bp === null) {
      ctx.addIssue({ code: "custom", message: "Percentagem inválida (0 a 100)." });
      return z.NEVER;
    }
    return bp;
  });

export const percentOptional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const bp = parsePercentToBp(v);
    if (bp === null) {
      ctx.addIssue({ code: "custom", message: "Percentagem inválida (0 a 100)." });
      return z.NEVER;
    }
    return bp;
  });

/** Whole number ≥ min; empty → null. */
export const optionalInt = (min = 0, max = 1_000_000) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (v === "") return null;
      if (!/^-?\d+$/.test(v) || Number(v) < min || Number(v) > max) {
        ctx.addIssue({ code: "custom", message: `Indique um número inteiro entre ${min} e ${max}.` });
        return z.NEVER;
      }
      return Number(v);
    });

export const requiredInt = (min = 0, max = 1_000_000) =>
  z
    .string()
    .trim()
    .min(1, REQUIRED)
    .transform((v, ctx) => {
      if (!/^-?\d+$/.test(v) || Number(v) < min || Number(v) > max) {
        ctx.addIssue({ code: "custom", message: `Indique um número inteiro entre ${min} e ${max}.` });
        return z.NEVER;
      }
      return Number(v);
    });

/** YYYY-MM-DD (from <input type="date">) or DD/MM/YYYY → UTC-midnight Date. */
export const dateRequired = z
  .string()
  .trim()
  .min(1, REQUIRED)
  .transform((v, ctx) => {
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Data inválida." });
      return z.NEVER;
    }
    return d;
  });

export const dateOptional = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = parseDateOnly(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Data inválida." });
      return z.NEVER;
    }
    return d;
  });

export const idOptional = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v));

/** Portuguese NIF/NIPC check digit (mod 11). */
export function isValidPortugueseNif(nif: string): boolean {
  if (!/^[1235689]\d{8}$|^(45|70|71|72|74|75|77|79|90|91|98|99)\d{7}$/.test(nif)) return false;
  const digits = nif.split("").map(Number);
  const sum = digits.slice(0, 8).reduce((acc, d, i) => acc + d * (9 - i), 0);
  const check = 11 - (sum % 11);
  return digits[8] === (check >= 10 ? 0 : check);
}

/** NIF: digits only for PT, free text (EU VAT format) otherwise. Validated in the object schema. */
export const optionalVatNumber = z
  .string()
  .trim()
  .transform((v) => (v === "" ? null : v.replace(/[\s.-]/g, "").toUpperCase()));

/** Turns a ZodError into { field: [messages] } for forms. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
