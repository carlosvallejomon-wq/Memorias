import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

export const dynamic = "force-dynamic";

/**
 * Revisión rápida del estado del despliegue.
 *
 * Existe porque diagnosticar a ciegas no funciona: cuando algo falla en
 * producción, la app enseña "algo se ha torcido" y el motivo real se queda en
 * unos registros que hay que ir a buscar. Con esto se abre una dirección en el
 * navegador y se ve de un vistazo si la base de datos responde, si están las
 * tablas y qué versión está desplegada de verdad.
 *
 * No devuelve ningún secreto: de las variables de entorno solo dice si están
 * puestas, nunca su valor.
 */
export async function GET() {
  const inicio = Date.now();
  const resultado: Record<string, unknown> = {
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "desconocida",
    mensajeDelCambio: process.env.VERCEL_GIT_COMMIT_MESSAGE?.slice(0, 120) ?? null,
    entorno: process.env.VERCEL_ENV ?? "local",
    variables: {
      DATABASE_URL: !!process.env.DATABASE_URL,
      CLERK_SECRET_KEY: !!process.env.CLERK_SECRET_KEY,
      NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
      BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
    },
  };

  try {
    const tablas = await db().execute(
      sql`select table_name from information_schema.tables where table_schema = 'public' order by table_name`,
    );
    const nombres = tablas.rows.map((r) => String(r.table_name));

    const cuentas: Record<string, number | string> = {};
    for (const t of ["albums", "media", "comments", "guestbook_entries", "challenges"]) {
      if (!nombres.includes(t)) {
        cuentas[t] = "NO EXISTE — hay que visitar /api/setup";
        continue;
      }
      const r = await db().execute(sql.raw(`select count(*)::int as n from ${t}`));
      cuentas[t] = Number(r.rows[0]?.n ?? 0);
    }

    // Escritura de verdad, deshecha al momento: leer funciona aunque la base
    // esté en solo lectura o sin espacio, y crear un álbum es una escritura.
    let escritura = "ok";
    try {
      await db().execute(sql`begin`);
      await db().execute(
        sql`insert into albums (owner_id, name, kind, share_code) values ('diagnostico','prueba','evento','zzdiagnostico')`,
      );
      await db().execute(sql`rollback`);
    } catch (err) {
      escritura = err instanceof Error ? err.message : "falló";
      try {
        await db().execute(sql`rollback`);
      } catch {
        // Da igual: si el rollback falla es que la transacción ya se cerró.
      }
    }

    resultado.baseDeDatos = "responde";
    resultado.milisegundos = Date.now() - inicio;
    resultado.tablas = nombres;
    resultado.filas = cuentas;
    resultado.puedeEscribir = escritura;
  } catch (err) {
    resultado.baseDeDatos = "NO RESPONDE";
    resultado.milisegundos = Date.now() - inicio;
    resultado.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(resultado, {
    headers: { "Cache-Control": "no-store" },
  });
}
