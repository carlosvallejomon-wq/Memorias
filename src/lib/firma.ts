import { createHmac, timingSafeEqual } from "node:crypto";

// Firmas cortas para cosas que viajan por fuera de la base de datos: la cookie
// de "este móvil ya metió el código" y el enlace privado del cliente del
// evento. Ninguna de las dos necesita una tabla; con firmarlas basta para que
// no se puedan fabricar a mano.

function secreto(): string {
  // En local hay un respaldo predecible para facilitar pruebas. En producción
  // exigimos una clave exclusiva y fallamos de forma segura si no está.
  const secret = process.env.APP_SIGNING_SECRET;
  if (secret) return secret;

  if (process.env.NODE_ENV !== "production") return "memorias-vivas-local-only";
  throw new Error("Falta la variable APP_SIGNING_SECRET");
}

export function firmar(payload: string): string {
  return createHmac("sha256", secreto()).update(payload).digest("hex");
}

/** Comparación en tiempo constante, para no filtrar la firma a base de reintentos. */
export function firmaValida(payload: string, firma: string | undefined | null): boolean {
  if (!firma) return false;
  const esperada = firmar(payload);
  if (firma.length !== esperada.length) return false;
  return timingSafeEqual(Buffer.from(firma), Buffer.from(esperada));
}
