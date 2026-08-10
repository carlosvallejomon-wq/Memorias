import { timingSafeEqual } from "node:crypto";
import { firmar } from "@/lib/firma";

/**
 * Enlace privado para el dueño del evento.
 *
 * Cuando el álbum lo crea una agencia (o un fotógrafo) para un cliente, el
 * cliente no tiene cuenta: no puede entrar al panel a elegir la portada de su
 * libro ni a diseñar su invitación. Y darle la contraseña de la agencia no es
 * opción, porque vería los álbumes de todos los demás clientes.
 *
 * La solución es un enlace con firma. No hace falta tabla ni registro: la
 * firma va calculada sobre el propio identificador del álbum, así que el
 * enlace no se puede adivinar pero tampoco hay nada que guardar ni caducar a
 * mano. Si algún día hiciera falta invalidarlos todos, basta con cambiar la
 * clave del entorno.
 *
 * No sustituye al portero de siempre: la página del cliente pasa además por
 * `guardAlbum`, así que el código de acceso y la fecha de borrado siguen
 * mandando.
 */

/** 32 caracteres hex = 128 bits. De sobra para un enlace que va por WhatsApp. */
const LARGO = 32;

export function clientToken(albumId: string): string {
  return firmar(`cliente:${albumId}`).slice(0, LARGO);
}

export function isValidClientToken(albumId: string, token: string | null | undefined): boolean {
  if (!token || token.length !== LARGO) return false;
  // Comparación en tiempo constante, para no filtrar el token a base de
  // reintentos cronometrados.
  return timingSafeEqual(Buffer.from(token), Buffer.from(clientToken(albumId)));
}

/** Ruta relativa del enlace que se le pasa al cliente. */
export function clientLinkPath(shareCode: string, albumId: string): string {
  return `/a/${shareCode}/personalizar?k=${clientToken(albumId)}`;
}
