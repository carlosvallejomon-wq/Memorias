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
  | "realBodaCorazon"
  | "realBodaCeremonia"
  | "realBodaMomentos"
  | "realBodaFlores"
  | "realBodaAzul"
  | "realBautizoCorona"
  | "realBautizoPaloma"
  | "realBautizoMarmol"
  | "realBautizoCeleste"
  | "realBautizoAngel"
  | "realComunionFlores"
  | "realComunionNina"
  | "realComunionNino"
  | "realComunionCorona"
  | "realComunionIglesia"
  | "realBabyKoala"
  | "realBabyOvejita"
  | "realBabyNina"
  | "realBabyNino"
  | "realBabyDormido"
  | "realCumpleSencilla"
  | "realCumpleNina"
  | "realCumpleOsito"
  | "realCumpleArcoiris"
  | "realCumpleNino"
  | "realFamiliaIlustrada"
  | "realFamiliaMontana"
  | "realFamiliaAcuarela"
  | "realFamiliaManos"
  | "realFamiliaPlaya"
  | "realViajesVintage"
  | "realViajesPolaroid"
  | "realViajesAventuras"
  | "realViajesCoche"
  | "realViajesPostales"
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

  // Familia. "Montaña" y "montaña y manos" son el mismo diseño cambiando una
  // foto pequeña de abajo; se dejan las dos porque a tamaño grande sí se
  // distinguen, pero por eso llevan nombres que dicen en qué se diferencian.
  { id: "realFamilia", file: "familia.jpg", label: "Familia · clásica", accent: [0.5, 0.38, 0.25], band: 0.405, compact: true },
  { id: "realFamiliaIlustrada", file: "familia-ilustrada.jpg", label: "Familia · ilustrada", accent: [0.62, 0.42, 0.3], band: 0.5 },
  { id: "realFamiliaMontana", file: "familia-montana.jpg", label: "Familia · montaña", accent: [0.32, 0.38, 0.45], band: 0.5 },
  { id: "realFamiliaManos", file: "familia-manos.jpg", label: "Familia · montaña y manos", accent: [0.32, 0.38, 0.45], band: 0.5 },
  { id: "realFamiliaAcuarela", file: "familia-acuarela.jpg", label: "Familia · acuarela", accent: [0.55, 0.45, 0.35], band: 0.5 },
  { id: "realFamiliaPlaya", file: "familia-playa.jpg", label: "Familia · playa", accent: [0.24, 0.28, 0.4], band: 0.5 },

  // Boda: varios diseños, desde el clásico con foto hasta los ilustrados.
  { id: "realBoda", file: "boda.jpg", label: "Boda · clásica", accent: [0.44, 0.13, 0.18], band: 0.42 },
  { id: "realBodaCorazon", file: "boda-corazon.jpg", label: "Boda · corazón", accent: [0.55, 0.35, 0.35], band: 0.5 },
  { id: "realBodaCeremonia", file: "boda-ceremonia.jpg", label: "Boda · ceremonia", accent: [0.42, 0.47, 0.38], band: 0.5 },
  { id: "realBodaMomentos", file: "boda-momentos.jpg", label: "Boda · momentos", accent: [0.75, 0.5, 0.52], band: 0.5 },
  { id: "realBodaFlores", file: "boda-flores.jpg", label: "Boda · flores", accent: [0.72, 0.45, 0.25], band: 0.5 },
  { id: "realBodaAzul", file: "boda-azul.jpg", label: "Boda · flores azules", accent: [0.35, 0.45, 0.66], band: 0.5 },

  // Quinceañera: varios diseños para elegir, que es la celebración donde más
  // se cuida la estética y con una sola portada no había dónde escoger.
  { id: "realQuince", file: "quince.jpg", label: "Quinceañera · tarta", accent: [0.82, 0.5, 0.6], band: 0.97, compact: true },
  { id: "realQuinceFlores", file: "quince-flores.jpg", label: "Quinceañera · flores", accent: [0.42, 0.14, 0.34], band: 0.5 },
  { id: "realQuinceVestido", file: "quince-vestido.jpg", label: "Quinceañera · vestido", accent: [0.85, 0.52, 0.33], band: 0.5 },
  { id: "realQuinceLazo", file: "quince-lazo.jpg", label: "Quinceañera · lazo", accent: [0.72, 0.42, 0.55], band: 0.5 },
  { id: "realQuinceMariposas", file: "quince-mariposas.jpg", label: "Quinceañera · mariposas", accent: [0.55, 0.38, 0.68], band: 0.5 },
  { id: "realQuincePrincesa", file: "quince-princesa.jpg", label: "Quinceañera · princesa", accent: [0.84, 0.54, 0.62], band: 0.5 },

  { id: "realGraduacion", file: "graduacion.jpg", label: "Graduación", accent: [0.16, 0.21, 0.35], band: 0.9 },

  // Primera comunión: seis diseños, en rosa y en azul.
  { id: "realComunion", file: "comunion.jpg", label: "Primera comunión · clásica", accent: [0.72, 0.58, 0.32], band: 0.885 },
  { id: "realComunionFlores", file: "comunion-flores.jpg", label: "Primera comunión · flores", accent: [0.82, 0.46, 0.55], band: 0.5 },
  { id: "realComunionNina", file: "comunion-nina.jpg", label: "Primera comunión · niña", accent: [0.74, 0.42, 0.4], band: 0.5 },
  { id: "realComunionNino", file: "comunion-nino.jpg", label: "Primera comunión · niño", accent: [0.34, 0.5, 0.72], band: 0.5 },
  { id: "realComunionCorona", file: "comunion-corona.jpg", label: "Primera comunión · corona", accent: [0.78, 0.34, 0.55], band: 0.5 },
  { id: "realComunionIglesia", file: "comunion-iglesia.jpg", label: "Primera comunión · iglesia", accent: [0.28, 0.4, 0.6], band: 0.5 },


  // Bautizo: seis diseños, del clásico a los ilustrados en tonos celestes.
  { id: "realBautizo", file: "bautizo.jpg", label: "Bautizo · clásico", accent: [0.76, 0.59, 0.47], band: 0.89 },
  { id: "realBautizoCorona", file: "bautizo-corona.jpg", label: "Bautizo · corona", accent: [0.5, 0.52, 0.36], band: 0.5 },
  { id: "realBautizoPaloma", file: "bautizo-paloma.jpg", label: "Bautizo · paloma", accent: [0.66, 0.52, 0.28], band: 0.5 },
  { id: "realBautizoMarmol", file: "bautizo-marmol.jpg", label: "Bautizo · mármol", accent: [0.6, 0.52, 0.3], band: 0.5 },
  { id: "realBautizoCeleste", file: "bautizo-celeste.jpg", label: "Bautizo · celeste", accent: [0.38, 0.52, 0.7], band: 0.5 },
  { id: "realBautizoAngel", file: "bautizo-angel.jpg", label: "Bautizo · angelito", accent: [0.3, 0.42, 0.62], band: 0.5 },


  // Baby shower: seis diseños, en rosa, azul y neutro para quien no quiere
  // decir todavía si es niño o niña.
  { id: "realBabyShower", file: "babyshower.jpg", label: "Baby shower · clásico", accent: [0.5, 0.62, 0.72], band: 0.435 },
  { id: "realBabyKoala", file: "baby-koala.jpg", label: "Baby shower · koala", accent: [0.85, 0.42, 0.55], band: 0.5 },
  { id: "realBabyOvejita", file: "baby-ovejita.jpg", label: "Baby shower · ovejita", accent: [0.36, 0.5, 0.72], band: 0.5 },
  { id: "realBabyNina", file: "baby-nina.jpg", label: "Baby shower · niña", accent: [0.8, 0.5, 0.5], band: 0.5 },
  { id: "realBabyNino", file: "baby-nino.jpg", label: "Baby shower · niño", accent: [0.3, 0.44, 0.62], band: 0.5 },
  { id: "realBabyDormido", file: "baby-dormido.jpg", label: "Baby shower · bebé dormido", accent: [0.55, 0.58, 0.38], band: 0.5 },


  // Fiesta infantil: seis diseños, de la portada sobria con marco para la foto
  // a las ilustradas a todo color.
  { id: "realFiestaInfantil", file: "fiestainfantil.jpg", label: "Fiesta infantil · clásica", accent: [0.87, 0.56, 0.34], band: 0.4 },
  { id: "realCumpleSencilla", file: "cumple-sencilla.jpg", label: "Fiesta infantil · sencilla", accent: [0.28, 0.6, 0.62], band: 0.5 },
  { id: "realCumpleNina", file: "cumple-nina.jpg", label: "Fiesta infantil · niña", accent: [0.55, 0.36, 0.62], band: 0.5 },
  { id: "realCumpleOsito", file: "cumple-osito.jpg", label: "Fiesta infantil · osito", accent: [0.5, 0.3, 0.62], band: 0.5 },
  { id: "realCumpleArcoiris", file: "cumple-arcoiris.jpg", label: "Fiesta infantil · arcoíris", accent: [0.45, 0.32, 0.66], band: 0.5 },
  { id: "realCumpleNino", file: "cumple-nino.jpg", label: "Fiesta infantil · niño", accent: [0.18, 0.38, 0.68], band: 0.5 },


  // Viajes: seis diseños, del cuaderno de cuero al dibujo del coche cargado.
  { id: "realViajes", file: "viajes.jpg", label: "Viajes · clásico", accent: [0.74, 0.44, 0.2], band: 0.89 },
  { id: "realViajesVintage", file: "viajes-vintage.jpg", label: "Viajes · cuaderno de cuero", accent: [0.45, 0.34, 0.2], band: 0.5 },
  { id: "realViajesPolaroid", file: "viajes-polaroid.jpg", label: "Viajes · polaroid", accent: [0.4, 0.3, 0.18], band: 0.5 },
  { id: "realViajesAventuras", file: "viajes-aventuras.jpg", label: "Viajes · aventuras", accent: [0.2, 0.28, 0.42], band: 0.5 },
  { id: "realViajesCoche", file: "viajes-coche.jpg", label: "Viajes · en coche", accent: [0.32, 0.58, 0.6], band: 0.5 },
  { id: "realViajesPostales", file: "viajes-postales.jpg", label: "Viajes · postales", accent: [0.55, 0.45, 0.25], band: 0.5 },

  { id: "realNavidad", file: "navidad.jpg", label: "Navidad", accent: [0.48, 0.1, 0.12], band: 0.31 },
  { id: "realAnoNuevo", file: "anonuevo.jpg", label: "Año nuevo", accent: [0.68, 0.55, 0.28], band: 0.375 },
];

export const TEMPLATE_COVERS_BY_ID = Object.fromEntries(
  TEMPLATE_COVER_LIST.map((t) => [t.id, t]),
) as Record<TemplateDotbookStyle, TemplateCoverMeta>;

export function isTemplateDotbookStyle(value: string): value is TemplateDotbookStyle {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_COVERS_BY_ID, value);
}
