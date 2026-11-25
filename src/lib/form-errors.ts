import type { FieldValues, Path, UseFormSetError } from "react-hook-form";

/** Copies server-side field errors from a Server Action into React Hook Form. */
export function applyFieldErrors<T extends FieldValues>(
  setError: UseFormSetError<T>,
  errors: Record<string, string[] | undefined> | undefined,
) {
  if (!errors) return;
  for (const [key, messages] of Object.entries(errors)) {
    if (messages?.[0]) setError(key as Path<T>, { type: "server", message: messages[0] });
  }
}
