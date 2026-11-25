import "server-only";
import { redirect } from "next/navigation";

import { auth } from "@/auth";

/**
 * Use at the top of every Server Action and server page that touches data.
 * The middleware already protects routes; this also protects direct action calls.
 */
export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}
