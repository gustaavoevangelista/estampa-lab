"use server";

import { revalidatePath } from "next/cache";

import type { ActionResult } from "@/lib/action-result";
import { requireUser } from "@/lib/session";
import { fieldErrors } from "@/lib/validation";
import { settingsFormSchema, type SettingsFormInput } from "./schema";
import { saveSettings } from "./settings";

export async function updateSettings(input: SettingsFormInput): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "OWNER") return { ok: false, error: "Só o administrador pode alterar as definições." };
  const parsed = settingsFormSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Verifique os campos assinalados.", fieldErrors: fieldErrors(parsed.error) };
  await saveSettings(parsed.data);
  revalidatePath("/", "layout");
  return { ok: true, message: "Definições guardadas." };
}
