import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-5xl font-bold text-brand-orange">404</p>
      <h1 className="text-xl font-semibold">Página não encontrada</h1>
      <p className="text-sm text-muted-foreground">O endereço que procura não existe ou foi removido.</p>
      <Button asChild>
        <Link href="/">Voltar ao painel</Link>
      </Button>
    </main>
  );
}
