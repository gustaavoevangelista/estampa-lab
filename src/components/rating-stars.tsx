import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

export function RatingStars({ value, className }: { value: number | null; className?: string }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  return (
    <span className={cn("inline-flex items-center gap-0.5", className)} role="img" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          aria-hidden="true"
          className={cn("size-3.5", i < value ? "fill-brand-orange text-brand-orange" : "text-border")}
        />
      ))}
    </span>
  );
}
