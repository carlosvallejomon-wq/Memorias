import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNotNull, lte } from "drizzle-orm";
import { del } from "@vercel/blob";
import { db } from "@/db";
import { albums, media } from "@/db/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Borra los álbumes cuya fecha de cierre ya pasó. Esa fecha SOLO existe si el
// organizador la puso a mano: un álbum normal no caduca nunca y esta tarea no
// lo toca jamás.
//
// La ejecuta Vercel una vez al día (ver vercel.json). Es idempotente: si se
// ejecuta dos veces, la segunda no encuentra nada que borrar.
export async function GET(request: NextRequest) {
  // La autorización es obligatoria porque esta ruta elimina datos y archivos.
  // Vercel envía automáticamente esta cabecera cuando CRON_SECRET está puesto.
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    console.error("No se ejecutó la limpieza: falta CRON_SECRET");
    return NextResponse.json({ error: "Servicio no configurado" }, { status: 503 });
  }
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const caducados = await db()
    .select({ id: albums.id, name: albums.name })
    .from(albums)
    .where(and(isNotNull(albums.expiresAt), lte(albums.expiresAt, new Date())));

  let borrados = 0;
  let archivosHuerfanos = 0;

  for (const album of caducados) {
    let urls: string[] = [];
    try {
      const archivos = await db()
        .select({ url: media.url, posterUrl: media.posterUrl })
        .from(media)
        .where(eq(media.albumId, album.id));
      urls = archivos.flatMap((a) => (a.posterUrl ? [a.url, a.posterUrl] : [a.url]));

      // Primero la fila: si luego falla el borrado de los archivos, al menos
      // el álbum ya no es accesible y la próxima pasada no lo reintenta en
      // bucle.
      await db().delete(albums).where(eq(albums.id, album.id));
      borrados += 1;
    } catch (err) {
      console.error(`No se pudo borrar el álbum caducado ${album.id}:`, err);
      continue;
    }

    // El almacenamiento se limpia aparte: si falla (corte de red, permisos),
    // el álbum ya está borrado y solo quedan archivos sueltos que nadie puede
    // alcanzar. Se cuentan para que se vea en el registro.
    try {
      // En tandas, porque `del` con miles de URLs de golpe se atraganta.
      for (let i = 0; i < urls.length; i += 100) {
        await del(urls.slice(i, i + 100));
      }
    } catch (err) {
      archivosHuerfanos += urls.length;
      console.error(
        `Álbum ${album.id} («${album.name}») borrado, pero quedaron ${urls.length} archivos sin limpiar:`,
        err,
      );
    }
  }

  return NextResponse.json({ ok: true, borrados, archivosHuerfanos });
}
