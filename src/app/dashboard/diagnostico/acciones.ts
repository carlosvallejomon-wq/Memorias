"use server";

import { auth } from "@clerk/nextjs/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";

/**
 * Prueba de vida de las acciones de servidor.
 *
 * Crear y borrar un álbum son las dos únicas cosas del panel que pasan por
 * aquí, y las dos fallaron a la vez mientras la base de datos respondía y
 * aceptaba escrituras. Con esto se comprueba por separado cada eslabón de esa
 * cadena, que es lo que no se podía distinguir desde fuera:
 *
 *   1. si la acción llega a ejecutarse siquiera;
 *   2. si `auth()` reconoce la sesión aquí dentro. Esto es lo que obliga a que
 *      la página viva dentro de `/dashboard`: una acción de servidor se envía
 *      por POST a la dirección de la página actual, así que solo desde aquí
 *      pasa por el mismo middleware que crear o borrar un álbum. Puesta
 *      fuera, fallaba siempre y no probaba nada;
 *   3. si desde dentro de la acción se puede escribir en la base de datos.
 *
 * Devuelve solo síes y noes: ningún identificador de usuario ni nada privado.
 */
export type Diagnostico = {
  accionEjecutada: boolean;
  version: string;
  sesion: "sí" | "no" | string;
  escritura: "ok" | string;
};

export async function probarAccionDeServidor(): Promise<Diagnostico> {
  const salida: Diagnostico = {
    accionEjecutada: true,
    // Si esto no coincide con la versión que sale en /api/diagnostico, la
    // página se cargó de un despliegue y la acción fue a parar a otro.
    version: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "local",
    sesion: "no",
    escritura: "ok",
  };

  try {
    const { userId } = await auth();
    salida.sesion = userId ? "sí" : "no";
  } catch (err) {
    salida.sesion = `error: ${err instanceof Error ? err.message : String(err)}`;
  }

  try {
    await db().execute(sql`begin`);
    await db().execute(
      sql`insert into albums (owner_id, name, kind, share_code) values ('diagnostico','prueba','evento','zzaccion')`,
    );
    await db().execute(sql`rollback`);
  } catch (err) {
    salida.escritura = err instanceof Error ? err.message : String(err);
    try {
      await db().execute(sql`rollback`);
    } catch {
      // La transacción ya estaba cerrada; no hay nada que deshacer.
    }
  }

  return salida;
}
