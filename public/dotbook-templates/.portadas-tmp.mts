// Genera la portada del Dotbook en las 12 plantillas reales para revisar
// que la placa de texto caiga en la zona limpia de cada diseño.
import { writeFileSync } from "node:fs";
import { asc, eq } from "drizzle-orm";
import { db } from "/home/user/Memorias/src/db";
import { albums, media } from "/home/user/Memorias/src/db/schema";
import { buildDotbookPdf, TEMPLATE_DOTBOOK_STYLES } from "/home/user/Memorias/src/lib/build-dotbook";
import type { DotbookStyle } from "/home/user/Memorias/src/lib/build-dotbook";

const OUT = process.argv[2] ?? "/tmp";

const [album] = await db().select().from(albums).where(eq(albums.shareCode, "pruebalocal"));
if (!album) throw new Error("no hay álbum de prueba");

const items = (
  await db().select().from(media).where(eq(media.albumId, album.id)).orderBy(asc(media.createdAt))
).slice(0, 1);

for (const s of TEMPLATE_DOTBOOK_STYLES) {
  const bytes = await buildDotbookPdf(
    album,
    items,
    {
      commentsByMedia: new Map(),
      reactionCountByMedia: new Map(),
      messages: [],
      shareUrl: "http://localhost:3111/a/pruebalocal",
      baseUrl: "http://localhost:3111",
    },
    s.id as DotbookStyle,
  );
  writeFileSync(`${OUT}/portada-${s.id}.pdf`, bytes);
  console.log("ok", s.id);
}
process.exit(0);
