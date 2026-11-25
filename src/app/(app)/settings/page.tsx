import type { Metadata } from "next";

import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/features/settings/settings-form";
import { getSettings } from "@/features/settings/settings";
import { bpToInput, formatAmount } from "@/lib/money";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Definições" };



export default async function SettingsPage() {
  await requireUser();
  const s = await getSettings();
  return (
    <>
      <PageHeader title="Definições" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Preços e custos</CardTitle>
          <CardDescription>Valores por defeito para IVA, alertas de margem e mão de obra.</CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForm
            defaultValues={{
              defaultVatRateBp: bpToInput(s.defaultVatRateBp),
              marginWarningBp: bpToInput(s.marginWarningBp),
              labourHourlyRateCents: formatAmount(s.labourHourlyRateCents),
            }}
          />
        </CardContent>
      </Card>
    </>
  );
}
