import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { storage } from "@/lib/storage";

/** Serves an uploaded attachment to signed-in users only. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) return new Response("Não autorizado", { status: 401 });
  const { id } = await params;
  const att = await prisma.attachment.findUnique({ where: { id } });
  if (!att) return new Response("Ficheiro não encontrado", { status: 404 });
  const obj = await storage().get(att.storageKey);
  if (!obj) return new Response("Ficheiro não encontrado", { status: 404 });
  return new Response(new Uint8Array(obj.body), {
    headers: {
      "Content-Type": att.mimeType,
      "Content-Length": String(obj.body.length),
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(att.originalName)}`,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
