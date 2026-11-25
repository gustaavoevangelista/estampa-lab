"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const TABS = [
  { href: "/ledger", label: "Movimentos" },
  { href: "/ledger/recurring", label: "Recorrentes" },
  { href: "/ledger/categories", label: "Categorias" },
];

export function LedgerNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Secções de receitas e despesas" className="mb-6 flex gap-1 border-b">
      {TABS.map((t) => {
        const active = t.href === "/ledger" ? pathname === "/ledger" || /^\/ledger\/(new|c[a-z0-9]{20,})/.test(pathname) : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              active ? "border-brand-orange text-foreground" : "border-transparent",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
