"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { ActionResult } from "@/lib/action-result";

export function ConfirmDeleteButton({
  title,
  description,
  onConfirm,
  redirectTo,
  label = "Eliminar",
  size = "sm",
  iconOnly = false,
}: {
  title: string;
  description: string;
  onConfirm: () => Promise<ActionResult>;
  redirectTo?: string;
  label?: string;
  size?: "sm" | "icon" | "default";
  iconOnly?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant={iconOnly ? "ghost" : "outline"} size={iconOnly ? "icon" : size} aria-label={iconOnly ? label : undefined}>
          <Trash2 aria-hidden="true" className={iconOnly ? "text-destructive" : undefined} />
          {!iconOnly && label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(e) => {
              e.preventDefault();
              startTransition(async () => {
                const res = await onConfirm();
                if (res.ok) {
                  toast.success(res.message ?? "Eliminado.");
                  if (redirectTo) router.push(redirectTo);
                  else router.refresh();
                } else {
                  toast.error(res.error);
                }
              });
            }}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {label}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
