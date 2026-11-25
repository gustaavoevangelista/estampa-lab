import Link from "next/link";
import { Plus } from "lucide-react";

import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { LedgerNav } from "@/features/ledger/ledger-nav";

export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader
        title="Receitas e despesas"
        description="Movimentos, IVA, despesas recorrentes e categorias."
        actions={
          <Button asChild>
            <Link href="/ledger/new">
              <Plus aria-hidden="true" /> Novo movimento
            </Link>
          </Button>
        }
      />
      <LedgerNav />
      {children}
    </>
  );
}
