import { createHmac, timingSafeEqual } from "node:crypto";

// Firmas cortas para cosas que viajan por fuera de la base de datos: la cookie
// de "este móvil ya metió el código" y el enlace privado del cliente del
// evento. Ninguna de las dos necesita una tabla; con firmarlas basta para que
// no se puedan fabricar a mano.

function secreto(): string {
  // Si no hay clave propia, se usa lo que haya: no es ideal, pero evita que la
  // función se caiga por una variable sin poner.
  return process.env.CLERK_SECRET_KEY || process.env.DATABASE_URL || "memorias-vivas";
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
