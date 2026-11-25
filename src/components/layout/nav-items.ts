import { LayoutDashboard, Package, ReceiptEuro, Settings, Truck, type LucideIcon } from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Painel", icon: LayoutDashboard },
  { href: "/products", label: "Produtos e custos", icon: Package },
  { href: "/ledger", label: "Receitas e despesas", icon: ReceiptEuro },
  { href: "/suppliers", label: "Fornecedores", icon: Truck },
  { href: "/settings", label: "Definições", icon: Settings },
];
