import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { media } from "@/db/schema";

export const dynamic = "force-dynamic";

// Un invitado puede borrar únicamente el recuerdo que subió él mismo
// (identificado por su UUID anónimo de localStorage, no hay login real).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const guestId = request.nextUrl.searchParams.get("guestId") ?? "";
  if (!guestId) {
    return NextResponse.json({ error: "Falta guestId" }, { status: 400 });
  }

  const deleted = await db()
    .delete(media)
    .where(and(eq(media.id, mediaId), eq(media.uploaderId, guestId)))
    .returning({ url: media.url });

  if (deleted.length === 0) {
    return NextResponse.json(
      { error: "No se encontró ese recuerdo o no te pertenece" },
      { status: 404 },
    );
  }

  try {
    await del(deleted[0].url);
  } catch (err) {
    console.error("No se pudo borrar el blob:", err);
  }

  return NextResponse.json({ ok: true });
}
