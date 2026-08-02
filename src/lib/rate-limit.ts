// Freno sencillo para que nadie llene de comentarios o mensajes un álbum
// abierto. Cuenta en memoria del propio servidor: no es infalible (en Vercel
// hay varias instancias y se reinician), pero corta de raíz el caso real —
// alguien pegándole a "enviar" en bucle o un script tonto.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/**
 * @param key    quién hace la petición (IP + acción)
 * @param limit  peticiones permitidas en la ventana
 * @param windowMs duración de la ventana
 * @returns true si se permite, false si hay que frenarlo
 */
export function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    // Limpieza perezosa: sin esto el mapa crecería sin parar.
    if (buckets.size > 5000) {
      for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
    }
    return true;
  }

  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Identifica al que llama por su IP, mirando las cabeceras del proxy. */
export function clientKey(request: Request, action: string): string {
  const h = request.headers;
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "desconocido";
  return `${action}:${ip}`;
}
