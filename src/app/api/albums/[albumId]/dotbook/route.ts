import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums } from "@/db/schema";
import { dotbookResponse, parseDotbookStyle } from "@/lib/dotbook-response";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Genera el "Dotbook digital" del álbum (PDF). Esta puerta es la del dueño de
// la cuenta; la del dueño del evento, que entra con su enlace privado y sin
// registrarse, está en /api/guest/[code]/dotbook.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ albumId: string }> },
) {
  const { albumId } = await params;
  const style = parseDotbookStyle(request.nextUrl.searchParams.get("style"));

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const [album] = await db()
    .select()
    .from(albums)
    .where(and(eq(albums.id, albumId), eq(albums.ownerId, userId)));
  if (!album) {
    return NextResponse.json({ error: "Álbum no encontrado" }, { status: 404 });
  }

  return dotbookResponse(album, style);
}
