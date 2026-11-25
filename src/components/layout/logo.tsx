import { cn } from "@/lib/utils";

export function Logo({ className, showTagline = false }: { className?: string; showTagline?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" className="size-8 shrink-0">
        <rect width="32" height="32" rx="8" fill="#F28C28" />
        <path d="M9 9h13v3.2h-9.2v2.6h8v3.2h-8v2.8H23V24H9z" fill="#1B2A4A" />
      </svg>
      <div className="leading-tight">
        <span className="block text-lg font-bold tracking-tight">
          Estampa<span className="text-brand-orange">Lab</span>
        </span>
        {showTagline && (
          <span className="block text-[11px] tracking-wide opacity-80">Personaliza • Estampa • Cria</span>
        )}
      </div>
    </div>
  );
}
