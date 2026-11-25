"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Pencil, Plus, X } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import type { ActionResult } from "@/lib/action-result";
import { createCategory, deleteCategory, renameCategory } from "./actions";

type Cat = { id: string; name: string; type: "INCOME" | "EXPENSE"; children: { id: string; name: string }[] };

function useRun() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<ActionResult>, onOk?: () => void) =>
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message);
        onOk?.();
        router.refresh();
      } else toast.error(r.error);
    });
  return { pending, run };
}

function CategoryRow({ id, name, sub }: { id: string; name: string; sub?: boolean }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const { pending, run } = useRun();
  return (
    <li className={sub ? "flex items-center gap-2 py-1 pl-6" : "flex items-center gap-2 py-1.5 font-medium"}>
      {editing ? (
        <>
          <Label htmlFor={`rename-${id}`} className="sr-only">
            Novo nome
          </Label>
          <Input id={`rename-${id}`} value={value} onChange={(e) => setValue(e.target.value)} className="h-8 max-w-64" autoFocus />
          <Button size="icon" variant="ghost" aria-label="Guardar" disabled={pending} onClick={() => run(() => renameCategory(id, value), () => setEditing(false))}>
            {pending ? <Loader2 className="animate-spin" /> : <Check />}
          </Button>
          <Button size="icon" variant="ghost" aria-label="Cancelar" onClick={() => setEditing(false)}>
            <X />
          </Button>
        </>
      ) : (
        <>
          <span className="flex-1">{name}</span>
          <Button size="icon" variant="ghost" aria-label={`Mudar o nome de ${name}`} onClick={() => setEditing(true)}>
            <Pencil />
          </Button>
          <ConfirmDeleteButton
            iconOnly
            label={`Eliminar ${name}`}
            title={`Eliminar "${name}"?`}
            description="Só é possível eliminar categorias sem movimentos nem subcategorias."
            onConfirm={() => deleteCategory(id)}
          />
        </>
      )}
    </li>
  );
}

function AddCategory({ type, parents }: { type: "INCOME" | "EXPENSE"; parents: Cat[] }) {
  const [name, setName] = useState("");
  const [parentId, setParentId] = useState("");
  const { pending, run } = useRun();
  const p = type.toLowerCase();
  return (
    <form
      className="mt-4 grid gap-2 border-t pt-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => createCategory({ name, type, parentId }), () => setName(""));
      }}
    >
      <div className="grid gap-1.5">
        <Label htmlFor={`new-${p}`}>Nova categoria</Label>
        <Input id={`new-${p}`} value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor={`parent-${p}`}>Dentro de</Label>
        <NativeSelect id={`parent-${p}`} value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">(categoria principal)</option>
          {parents.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </NativeSelect>
      </div>
      <Button type="submit" variant="secondary" disabled={pending || !name.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus aria-hidden="true" />} Adicionar
      </Button>
    </form>
  );
}

export function CategoriesManager({ tree }: { tree: Cat[] }) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {(["EXPENSE", "INCOME"] as const).map((type) => {
        const cats = tree.filter((c) => c.type === type);
        return (
          <Card key={type}>
            <CardHeader>
              <CardTitle>{type === "EXPENSE" ? "Despesas" : "Receitas"}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {cats.map((c) => (
                  <li key={c.id}>
                    <ul>
                      <CategoryRow id={c.id} name={c.name} />
                      {c.children.map((ch) => (
                        <CategoryRow key={ch.id} id={ch.id} name={ch.name} sub />
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
              <AddCategory type={type} parents={cats} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
