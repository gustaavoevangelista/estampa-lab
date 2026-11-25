import type { Metadata } from "next";

import { CategoriesManager } from "@/features/ledger/categories-manager";
import { getCategoryTree } from "@/features/ledger/queries";
import { requireUser } from "@/lib/session";

export const metadata: Metadata = { title: "Categorias" };

export default async function CategoriesPage() {
  await requireUser();
  const tree = await getCategoryTree();
  return (
    <CategoriesManager
      tree={tree.map((c) => ({ id: c.id, name: c.name, type: c.type, children: c.children.map((ch) => ({ id: ch.id, name: ch.name })) }))}
    />
  );
}
