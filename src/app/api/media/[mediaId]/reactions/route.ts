import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { media, reactions } from "@/db/schema";

export const dynamic = "force-dynamic";

const ALLOWED_EMOJIS = ["❤️", "😂", "😮", "👏"];

// Alterna una reacción: si el invitado ya reaccionó con ese emoji, se quita;
// si no, se añade.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const body = (await request.json()) as { guestId?: string; emoji?: string };

  if (!body.guestId || !body.emoji || !ALLOWED_EMOJIS.includes(body.emoji)) {
    return NextResponse.json({ error: "Petición no válida" }, { status: 400 });
  }

  const [exists] = await db()
    .select({ id: media.id })
    .from(media)
    .where(eq(media.id, mediaId));
  if (!exists) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  const deleted = await db()
    .delete(reactions)
    .where(
      and(
        eq(reactions.mediaId, mediaId),
        eq(reactions.guestId, body.guestId),
        eq(reactions.emoji, body.emoji),
      ),
    )
    .returning({ id: reactions.id });

  if (deleted.length === 0) {
    await db()
      .insert(reactions)
      .values({ mediaId, guestId: body.guestId, emoji: body.emoji })
      .onConflictDoNothing();
  }

  return NextResponse.json({ ok: true, reacted: deleted.length === 0 });
}
