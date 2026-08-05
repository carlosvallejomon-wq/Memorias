// Catálogo de portadas de plantilla del Dotbook.
//
// Vive aquí, sin depender de pdf-lib ni de nada del servidor, porque lo usan
// las dos partes: el generador del PDF y el selector que ve el organizador en
// el navegador. Antes la lista estaba copiada en los dos sitios y añadir una
// portada obligaba a tocar tres archivos; olvidarse de uno hacía que la
// plantilla existiera pero no se pudiera elegir.
//
// Para añadir una portada nueva basta con:
//   1. Dejar el JPG en `public/dotbook-templates/`.
//   2. Dejar una miniatura del mismo nombre en `.../thumbs/`.
//   3. Añadir una línea a esta lista.

export type TemplateDotbookStyle =
  | "realGeneral"
  | "realGraduacion"
  | "realComunion"
  | "realQuince"
  | "realQuinceFlores"
  | "realQuinceVestido"
  | "realQuinceLazo"
  | "realQuinceMariposas"
  | "realQuincePrincesa"
  | "realViajes"
  | "realFamilia"
  | "realAnoNuevo"
  | "realBoda"
  | "realBabyShower"
  | "realBautizo"
  | "realFiestaInfantil"
  | "realNavidad";

export type TemplateCoverMeta = {
  id: TemplateDotbookStyle;
  /** Archivo dentro de public/dotbook-templates (y de thumbs/). */
  file: string;
  /** Cómo se llama en el selector. */
  label: string;
  /**
   * Color del diseño, en 0–1. Lo heredan las páginas siguientes (fondo,
   * marco, rama decorativa) para que el libro entero vaya a juego.
   */
  accent: [number, number, number];
  /**
   * Respaldo por si no se puede analizar la imagen: punto vertical
   * (0 = arriba, 1 = abajo) donde dejar la placa del título. Normalmente no
   * se usa, porque la posición se calcula mirando el propio diseño.
   */
  band: number;
  /**
   * Para diseños con el hueco libre muy justo: la placa se dibuja algo más
   * pequeña para que quepa sin montarse sobre el texto del propio diseño.
   */
  compact?: boolean;
};

export const TEMPLATE_COVER_LIST: TemplateCoverMeta[] = [
  { id: "realGeneral", file: "general.jpg", label: "Recuerdos en general", accent: [0.62, 0.55, 0.42], band: 0.8225 },
  { id: "realFamilia", file: "familia.jpg", label: "Familia", accent: [0.5, 0.38, 0.25], band: 0.405, compact: true },
  { id: "realBoda", file: "boda.jpg", label: "Boda", accent: [0.44, 0.13, 0.18], band: 0.42 },

  // Quinceañera: varios diseños para elegir, que es la celebración donde más
  // se cuida la estética y con una sola portada no había dónde escoger.
  { id: "realQuince", file: "quince.jpg", label: "Quinceañera · tarta", accent: [0.82, 0.5, 0.6], band: 0.97, compact: true },
  { id: "realQuinceFlores", file: "quince-flores.jpg", label: "Quinceañera · flores", accent: [0.42, 0.14, 0.34], band: 0.5 },
  { id: "realQuinceVestido", file: "quince-vestido.jpg", label: "Quinceañera · vestido", accent: [0.85, 0.52, 0.33], band: 0.5 },
  { id: "realQuinceLazo", file: "quince-lazo.jpg", label: "Quinceañera · lazo", accent: [0.72, 0.42, 0.55], band: 0.5 },
  { id: "realQuinceMariposas", file: "quince-mariposas.jpg", label: "Quinceañera · mariposas", accent: [0.55, 0.38, 0.68], band: 0.5 },
  { id: "realQuincePrincesa", file: "quince-princesa.jpg", label: "Quinceañera · princesa", accent: [0.84, 0.54, 0.62], band: 0.5 },

  { id: "realGraduacion", file: "graduacion.jpg", label: "Graduación", accent: [0.16, 0.21, 0.35], band: 0.9 },
  { id: "realComunion", file: "comunion.jpg", label: "Primera comunión", accent: [0.72, 0.58, 0.32], band: 0.885 },
  { id: "realBautizo", file: "bautizo.jpg", label: "Bautizo", accent: [0.76, 0.59, 0.47], band: 0.89 },
  { id: "realBabyShower", file: "babyshower.jpg", label: "Baby shower", accent: [0.5, 0.62, 0.72], band: 0.435 },
  { id: "realFiestaInfantil", file: "fiestainfantil.jpg", label: "Fiesta infantil", accent: [0.87, 0.56, 0.34], band: 0.4 },
  { id: "realViajes", file: "viajes.jpg", label: "Viajes", accent: [0.74, 0.44, 0.2], band: 0.89 },
  { id: "realNavidad", file: "navidad.jpg", label: "Navidad", accent: [0.48, 0.1, 0.12], band: 0.31 },
  { id: "realAnoNuevo", file: "anonuevo.jpg", label: "Año nuevo", accent: [0.68, 0.55, 0.28], band: 0.375 },
];

export const TEMPLATE_COVERS_BY_ID = Object.fromEntries(
  TEMPLATE_COVER_LIST.map((t) => [t.id, t]),
) as Record<TemplateDotbookStyle, TemplateCoverMeta>;

export function isTemplateDotbookStyle(value: string): value is TemplateDotbookStyle {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_COVERS_BY_ID, value);
}
