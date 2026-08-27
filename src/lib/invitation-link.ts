// --- Estado de la invitación ------------------------------------------
//
// Vive aquí, fuera del componente del generador, porque lo necesitan tres
// sitios que no pueden importar código de navegador: la ruta que la guarda,
// la página `/i/[code]` que la sirve y el propio editor.
//
// Hay dos maneras de compartir una invitación:
//
//  - **Enlace largo** (`/invitacion?d=…`): todo el estado va serializado en
//    la URL. No crea nada en el servidor, pero para cambiar algo hay que
//    generar un enlace nuevo. Es lo que hacían las primeras invitaciones y
//    se mantiene para que los QR ya repartidos sigan abriéndose.
//  - **Enlace corto** (`/i/<código del álbum>`): el estado se guarda en la
//    tabla `invitations`. El organizador puede volver al panel, cambiar la
//    fecha o las fotos, y el mismo QR enseña lo nuevo.

/** Estilos visuales de la invitación interactiva, uno por tipo de evento. */
export const ESTILOS_INVITACION = [
  "quince",
  "boda",
  "baby",
  "cumple",
  "bautizo",
  "comunion",
  "graduacion",
] as const;

export type EstiloInvitacion = (typeof ESTILOS_INVITACION)[number];

export type TextLayout = {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  maxWidth: number;
};

export type QrLayout = { x: number; y: number; size: number };

export type InvitationLinkState = {
  t: string;
  n: string;
  d?: string;
  h?: string;
  l?: string;
  o?: string;
  r?: string;
  u: string;
  tx: TextLayout;
  dx?: TextLayout;
  q: QrLayout;
  // RSVP automático: los invitados contestan desde el enlace y la lista se
  // guarda en el panel del álbum. Los enlaces viejos siguen funcionando.
  ar?: boolean;
  // Datos de la experiencia web interactiva. Se guardan junto al resto para
  // que no se pierdan al compartir el QR.
  it?: boolean;
  /**
   * Plantilla de la invitación web (`PLANTILLAS` en `invitation-styles`).
   * Los enlaces repartidos antes de que hubiera catálogo traen aquí el
   * nombre del evento ("quince", "boda"…); `plantillaDe()` los resuelve.
   */
  iv?: string;
  st?: string;
  mp?: string;
  dr?: string;
  tl?: string;
  ms?: string;
  // Detalles que antes había que contar por WhatsApp: iniciales del lacre,
  // paleta de la vestimenta, colores a evitar, avisos y hashtag. Todo
  // opcional: los enlaces creados antes de esto se siguen abriendo igual.
  si?: string;
  pa?: string;
  ev?: string;
  av?: string;
  hg?: string;
  ga?: boolean;
  bd?: boolean;
  // Fotos que pone el organizador al preparar la invitación, antes de que el
  // álbum tenga nada: la de la portada y las de la galería. Van a Vercel Blob
  // igual que los recuerdos, pero no se registran como tales.
  fp?: string;
  fg?: string[];
  // Secciones que las invitaciones de este tipo dan por hechas y aquí
  // faltaban: a quién se menciona, los dos sitios del día por separado, el
  // regalo y las canciones que piden los invitados.
  /** Menciones, una por línea en formato "Rol: Nombre". */
  pd?: string;
  /** Ceremonia: lugar y dirección (varias líneas) + hora y enlace de mapa. */
  ce?: string;
  ch?: string;
  cm?: string;
  /** Recepción: lo mismo. */
  re?: string;
  rh?: string;
  rm?: string;
  /** Mesa de regalos: enlace y datos para transferencia. */
  mr?: string;
  cl?: string;
  /** Hospedaje sugerido, una línea por sitio. */
  ho?: string;
  /** Pedir canciones a los invitados. */
  sc?: boolean;
};

/**
 * Comprueba que un objeto cualquiera tenga la forma mínima de una
 * invitación. Lo usan tanto el navegador (al abrir un enlace) como el
 * servidor (al guardarla), así que no puede fiarse de nada.
 */
export function parseInvitationState(value: unknown): InvitationLinkState | null {
  if (!value || typeof value !== "object") return null;
  const parsed = value as Partial<InvitationLinkState>;
  if (
    typeof parsed.t !== "string" ||
    typeof parsed.n !== "string" ||
    typeof parsed.u !== "string" ||
    !parsed.tx ||
    !parsed.q
  ) {
    return null;
  }
  return parsed as InvitationLinkState;
}

export function encodeInvitationLink(state: InvitationLinkState): string {
  return encodeURIComponent(JSON.stringify(state));
}

/**
 * Lee el estado del parámetro `d`.
 *
 * `useSearchParams()` ya deshace el porcentaje, así que lo normal es que aquí
 * llegue el JSON tal cual. Antes se le pasaba otro `decodeURIComponent` y eso
 * reventaba cualquier invitación con un "%" en el texto ("10% de descuento"):
 * el navegador lo entregaba como "10%" y el segundo decodificado se
 * encontraba un escape a medias. Se intentan las dos formas para que los
 * enlaces que llegan sin decodificar sigan abriéndose.
 */
export function decodeInvitationLink(raw: string): InvitationLinkState | null {
  for (const texto of [raw, decodificarSuave(raw)]) {
    if (!texto) continue;
    try {
      const estado = parseInvitationState(JSON.parse(texto));
      if (estado) return estado;
    } catch {
      // Probamos con la otra forma.
    }
  }
  return null;
}

function decodificarSuave(valor: string): string | null {
  try {
    return decodeURIComponent(valor);
  } catch {
    return null;
  }
}
