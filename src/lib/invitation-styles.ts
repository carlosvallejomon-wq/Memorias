import type { EstiloInvitacion } from "@/lib/invitation-link";

// --- Catálogo de plantillas de la invitación web -----------------------
//
// Antes había una sola maqueta con siete paletas: cambiaba el color y poco
// más. Aquí cada plantilla decide también cómo se alternan los fondos, qué
// adorno se repite, cómo se escriben los títulos, con qué forma se enmarcan
// las fotos y qué cae de fondo. Con esas cinco decisiones dos plantillas del
// mismo color ya no se parecen.
//
// Añadir una plantilla es añadir una entrada a `PLANTILLAS`: no hay imágenes
// que subir ni archivos que tocar, porque toda la decoración está dibujada.

/** Fondo de cada sección: alternando, todo claro, o mandando el tono fuerte. */
export type Bandas = "alternas" | "claras" | "oscuras";

/** El dibujo que se repite bajo los títulos y en las esquinas. */
export type Motivo = "floral" | "botanico" | "deco" | "corazones" | "estrellas" | "lazo";

/** Cómo se escriben los títulos de sección. */
export type Titulos = "manuscrita" | "versalitas";

/** La forma con la que se recortan las fotos enmarcadas. */
export type Marco = "arco" | "ovalo" | "recto";

/** Lo que cae de fondo. */
export type Lluvia = "petalos" | "destellos" | "ninguna";

export type Paleta = {
  ink: string;
  paper: string;
  soft: string;
  mezcla: string;
  band: string;
  accent: string;
};

export type PlantillaInvitacion = {
  id: string;
  label: string;
  /** Para qué evento se propone; agrupa la lista del editor. */
  evento: EstiloInvitacion;
  paleta: Paleta;
  bandas: Bandas;
  motivo: Motivo;
  titulos: Titulos;
  marco: Marco;
  lluvia: Lluvia;
  /** Marco ilustrado propio para las portadas premium. */
  marcoIlustrado?: string;
};

export const PLANTILLAS: PlantillaInvitacion[] = [
  {
    id: "quince-rosa",
    label: "Rosa clásica",
    evento: "quince",
    paleta: { ink: "#54222f", paper: "#fdf2f6", soft: "#f8dee7", mezcla: "#f0c2d2", band: "#b05a76", accent: "#b05a76" },
    bandas: "alternas", motivo: "floral", titulos: "manuscrita", marco: "arco", lluvia: "petalos", marcoIlustrado: "/invitaciones/marco-quince-rosa.png",
  },
  {
    id: "quince-blush",
    label: "Blush botánica",
    evento: "quince",
    paleta: { ink: "#5d3b42", paper: "#fdf7f4", soft: "#f6e7de", mezcla: "#eed3c6", band: "#b9836f", accent: "#a97561" },
    bandas: "claras", motivo: "botanico", titulos: "versalitas", marco: "ovalo", lluvia: "ninguna",
  },
  {
    id: "quince-deco",
    label: "Noche dorada",
    evento: "quince",
    paleta: { ink: "#f2e9d8", paper: "#241f2b", soft: "#2f2839", mezcla: "#3b3247", band: "#c9a227", accent: "#d9b64a" },
    bandas: "oscuras", motivo: "deco", titulos: "versalitas", marco: "recto", lluvia: "destellos",
  },
  {
    id: "boda-marfil",
    label: "Marfil romántica",
    evento: "boda",
    paleta: { ink: "#3c3029", paper: "#faf5ec", soft: "#f0e6d5", mezcla: "#e0cdac", band: "#a07551", accent: "#a07551" },
    bandas: "claras", motivo: "floral", titulos: "manuscrita", marco: "arco", lluvia: "petalos", marcoIlustrado: "/invitaciones/marco-boda-marfil.png",
  },
  {
    id: "boda-olivo",
    label: "Verde olivo",
    evento: "boda",
    paleta: { ink: "#2f3a2a", paper: "#f6f7f0", soft: "#e3e8d6", mezcla: "#cdd6b8", band: "#6b7a4b", accent: "#6b7a4b" },
    bandas: "alternas", motivo: "botanico", titulos: "versalitas", marco: "arco", lluvia: "ninguna",
  },
  {
    id: "boda-noche",
    label: "Azul noche",
    evento: "boda",
    paleta: { ink: "#eef1f8", paper: "#1e2740", soft: "#28324f", mezcla: "#33405f", band: "#c2a35b", accent: "#cdb069" },
    bandas: "oscuras", motivo: "deco", titulos: "versalitas", marco: "recto", lluvia: "destellos",
  },
  {
    id: "baby-salvia",
    label: "Salvia con lazo",
    evento: "baby",
    paleta: { ink: "#2f4a40", paper: "#f3f9f4", soft: "#dfeee4", mezcla: "#c6ded1", band: "#5f8574", accent: "#5f8574" },
    bandas: "alternas", motivo: "lazo", titulos: "manuscrita", marco: "arco", lluvia: "ninguna",
  },
  {
    id: "cumple-coral",
    label: "Coral alegre",
    evento: "cumple",
    paleta: { ink: "#5a2f22", paper: "#fdf5f0", soft: "#fae0d3", mezcla: "#f4c6ae", band: "#c06a3c", accent: "#c06a3c" },
    bandas: "alternas", motivo: "corazones", titulos: "manuscrita", marco: "arco", lluvia: "petalos",
  },
  {
    id: "bautizo-celeste",
    label: "Celeste con estrellas",
    evento: "bautizo",
    paleta: { ink: "#26405c", paper: "#f4f8fc", soft: "#dde9f4", mezcla: "#c2d8ea", band: "#5a80a6", accent: "#5a80a6" },
    bandas: "claras", motivo: "estrellas", titulos: "manuscrita", marco: "ovalo", lluvia: "destellos",
  },
  {
    id: "comunion-dorada",
    label: "Comunión dorada",
    evento: "comunion",
    paleta: { ink: "#4a3f2a", paper: "#fdfaf1", soft: "#f4ecd8", mezcla: "#e8dbb8", band: "#9c8546", accent: "#9c8546" },
    bandas: "claras", motivo: "floral", titulos: "manuscrita", marco: "ovalo", lluvia: "ninguna",
  },
  {
    id: "graduacion-gala",
    label: "Graduación de gala",
    evento: "graduacion",
    paleta: { ink: "#eceef6", paper: "#20263c", soft: "#2a3150", mezcla: "#374064", band: "#b9a05a", accent: "#c6ad66" },
    bandas: "oscuras", motivo: "deco", titulos: "versalitas", marco: "recto", lluvia: "destellos",
  },
];

/** Plantilla que se usa cuando el enlace no trae ninguna reconocible. */
export const PLANTILLA_POR_DEFECTO = PLANTILLAS[0];

/**
 * Resuelve el campo `iv` del enlace.
 *
 * Guarda el identificador de la plantilla, pero los enlaces repartidos antes
 * de que hubiera catálogo traen el nombre del evento ("quince", "boda"…): en
 * ese caso se usa la primera plantilla de ese evento, que es la que tenía
 * exactamente esos colores.
 */
export function plantillaDe(valor?: string): PlantillaInvitacion {
  if (!valor) return PLANTILLA_POR_DEFECTO;
  return (
    PLANTILLAS.find((p) => p.id === valor) ??
    PLANTILLAS.find((p) => p.evento === valor) ??
    PLANTILLA_POR_DEFECTO
  );
}

export const NOMBRES_DE_EVENTO: Record<EstiloInvitacion, string> = {
  quince: "Quinceañera",
  boda: "Boda",
  baby: "Baby shower",
  cumple: "Cumpleaños",
  bautizo: "Bautizo",
  comunion: "Comunión",
  graduacion: "Graduación",
};
