import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { firmar, firmaValida } from "@/lib/firma";

// Código de acceso OPCIONAL por álbum.
//
// La idea del producto es que los invitados entren sin registrarse, así que
// esto viene apagado: mientras el organizador no ponga un código, el álbum se
// abre con el enlace igual que siempre. Cuando lo pone, hace falta teclearlo
// una vez por móvil.
//
// No es una contraseña de cuenta ni protege dinero: es la cerradura de un
// álbum de fotos. Aun así se guarda cifrada, nunca en claro, porque mucha
// gente reutiliza códigos.

const SCRYPT_KEYLEN = 32;

/** Solo dígitos, entre 4 y 8. Fácil de decir en voz alta en una boda. */
export function isValidPin(pin: string): boolean {
  return /^\d{4,8}$/.test(pin);
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16);
  const key = scryptSync(pin, salt, SCRYPT_KEYLEN);
  return `scrypt:${salt.toString("hex")}:${key.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string | null): boolean {
  if (!stored) return true; // álbum sin código: entra cualquiera con el enlace
  const [algoritmo, saltHex, keyHex] = stored.split(":");
  if (algoritmo !== "scrypt" || !saltHex || !keyHex) return false;
  const esperado = Buffer.from(keyHex, "hex");
  const calculado = scryptSync(pin, Buffer.from(saltHex, "hex"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}

// --- Recuerdo de "este móvil ya metió el código" ---
//
// Se guarda en una cookie firmada, no en localStorage: si solo lo comprobara
// el navegador, bastaría con pedir la lista de fotos a mano para saltarse el
// código. La firma impide fabricarse el permiso.

const COOKIE_PREFIX = "mv_acceso_";

export function accessCookieName(albumId: string): string {
  return COOKIE_PREFIX + albumId;
}

export function accessCookieValue(albumId: string, pinHash: string): string {
  return firmar(`${albumId}:${pinHash}`);
}

/**
 * ¿Este navegador puede ver el álbum? Si el álbum no tiene código, siempre.
 * Si lo tiene, solo con la cookie correcta — y la cookie deja de valer sola
 * en cuanto el organizador cambia o quita el código.
 */
export function hasAccess(
  albumId: string,
  pinHash: string | null,
  cookieValue: string | undefined,
): boolean {
  if (!pinHash) return true;
  return firmaValida(`${albumId}:${pinHash}`, cookieValue);
}
