import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { guestbookEntries } from "@/db/schema";

export const dynamic = "force-dynamic";

// Cada invitado puede borrar solo su propio mensaje (identificado por el UUID
// anónimo de localStorage, igual que con las fotos).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ entryId: string }> },
) {
  const { entryId } = await params;
  const guestId = request.nextUrl.searchParams.get("guestId") ?? "";
  if (!guestId) {
    return NextResponse.json({ error: "Falta guestId" }, { status: 400 });
  }

  const deleted = await db()
    .delete(guestbookEntries)
    .where(
      and(eq(guestbookEntries.id, entryId), eq(guestbookEntries.guestId, guestId)),
    )
    .returning({ id: guestbookEntries.id });

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "No se encontró ese mensaje o no te pertenece" },
      { status: 404 },
    );
  }

  return NextResponse.json({ ok: true });
}
