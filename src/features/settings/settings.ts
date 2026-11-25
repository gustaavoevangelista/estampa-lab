import "server-only";

import { prisma } from "@/lib/prisma";

export interface AppSettings {
  defaultVatRateBp: number;
  marginWarningBp: number;
  labourHourlyRateCents: number;
}

export const SETTINGS_DEFAULTS: AppSettings = {
  defaultVatRateBp: 2300,
  marginWarningBp: 3000,
  labourHourlyRateCents: 1500,
};

export async function getSettings(): Promise<AppSettings> {
  const rows = await prisma.setting.findMany({ where: { key: { in: Object.keys(SETTINGS_DEFAULTS) } } });
  const out = { ...SETTINGS_DEFAULTS };
  for (const r of rows) {
    const v = JSON.parse(r.value) as unknown;
    if (typeof v === "number" && Number.isSafeInteger(v)) out[r.key as keyof AppSettings] = v;
  }
  return out;
}

export async function saveSettings(values: AppSettings) {
  await prisma.$transaction(
    Object.entries(values).map(([key, value]) =>
      prisma.setting.upsert({ where: { key }, update: { value: JSON.stringify(value) }, create: { key, value: JSON.stringify(value) } }),
    ),
  );
}
