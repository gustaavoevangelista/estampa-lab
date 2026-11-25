import { LogOut } from "lucide-react";

import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export function UserMenu({ name, role }: { name: string; role: "OWNER" | "STAFF" }) {
  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden text-right leading-tight sm:block">
        <p className="text-sm font-medium">{name}</p>
        <p className="text-xs text-muted-foreground">{role === "OWNER" ? "Administrador" : "Equipa"}</p>
      </div>
      <form action={logout}>
        <Button variant="outline" size="sm" type="submit">
          <LogOut aria-hidden="true" />
          Sair
        </Button>
      </form>
    </div>
  );
}
