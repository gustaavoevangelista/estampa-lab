import { z } from "zod";

import { moneyRequiredNonNegative, percentRequired } from "@/lib/validation";

export const settingsFormSchema = z.object({
  defaultVatRateBp: percentRequired,
  marginWarningBp: percentRequired,
  labourHourlyRateCents: moneyRequiredNonNegative,
});

export type SettingsFormInput = z.input<typeof settingsFormSchema>;
