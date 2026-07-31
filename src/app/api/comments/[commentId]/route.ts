import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments } from "@/db/schema";

export const dynamic = "force-dynamic";

// Cada invitado puede borrar solo su propio comentario, igual que con sus
// fotos y sus mensajes del muro. Antes no había forma de retirar un
// comentario una vez publicado.
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ commentId: string }> },
) {
  const { commentId } = await params;
  const guestId = request.nextUrl.searchParams.get("guestId") ?? "";
  if (!guestId) {
    return NextResponse.json({ error: "Falta guestId" }, { status: 400 });
  }

  const deleted = await db()
    .delete(comments)
    .where(and(eq(comments.id, commentId), eq(comments.guestId, guestId)))
    .returning({ id: comments.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "No se encontró ese comentario o no te pertenece" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
