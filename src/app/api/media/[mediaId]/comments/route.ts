import { NextRequest, NextResponse } from "next/server";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { comments, media } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const rows = await db()
    .select({
      id: comments.id,
      authorName: comments.authorName,
      body: comments.body,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .where(eq(comments.mediaId, mediaId))
    .orderBy(asc(comments.createdAt));

  return NextResponse.json({ items: rows });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mediaId: string }> },
) {
  const { mediaId } = await params;
  const body = (await request.json()) as {
    authorName?: string;
    body?: string;
  };

  const text = (body.body ?? "").trim().slice(0, 1000);
  if (!text) {
    return NextResponse.json(
      { error: "El comentario está vacío" },
      { status: 400 },
    );
  }

  const [exists] = await db()
    .select({ id: media.id })
    .from(media)
    .where(eq(media.id, mediaId));
  if (!exists) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }

  const [row] = await db()
    .insert(comments)
    .values({
      mediaId,
      authorName: (body.authorName ?? "").trim().slice(0, 100) || null,
      body: text,
    })
    .returning();

  return NextResponse.json({ item: row });
}
