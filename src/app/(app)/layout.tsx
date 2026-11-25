import { Logo } from "@/components/layout/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { UserMenu } from "@/components/layout/user-menu";
import { requireUser } from "@/lib/session";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-[16rem_1fr]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-sm focus:font-medium"
      >
        Saltar para o conteúdo
      </a>

      <div className="hidden bg-sidebar lg:block">
        <aside className="sticky top-0 flex h-dvh flex-col text-sidebar-foreground">
          <div className="px-6 py-5">
            <Logo showTagline className="text-white" />
          </div>
          <SidebarNav />
        </aside>
      </div>

      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-3 border-b bg-background/95 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-2">
            <MobileNav />
            <Logo className="lg:hidden" />
          </div>
          <UserMenu name={user.name ?? user.email ?? ""} role={user.role} />
        </header>
        <main id="main" tabIndex={-1} className="flex-1 px-4 py-6 outline-none lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}
