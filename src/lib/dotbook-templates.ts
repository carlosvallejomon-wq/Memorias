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
  | "realQuinceRosasMarco"
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
  | "realFamiliaManos"
  | "realFamiliaCampo"
  | "realFamiliaFlores"
  | "realFamiliaPolaroids"
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

/**
 * Celebraciones por las que se puede filtrar en el selector. Con más de
 * cincuenta portadas, soltarlas todas de golpe en la rejilla obligaba a
 * bajar media pantalla para saber si había algo de bautizos.
 */
export const TEMPLATE_COVER_GROUPS = [
  { id: "todas", label: "Todas" },
  { id: "boda", label: "Bodas" },
  { id: "quince", label: "15 años" },
  { id: "bautizo", label: "Bautizo" },
  { id: "comunion", label: "Comunión" },
  { id: "cumple", label: "Fiesta infantil" },
  { id: "baby", label: "Baby shower" },
  { id: "familia", label: "Familia" },
  { id: "viajes", label: "Viajes" },
  { id: "otras", label: "Otras" },
] as const;

export type TemplateCoverGroup = (typeof TEMPLATE_COVER_GROUPS)[number]["id"];

export type TemplateCoverMeta = {
  id: TemplateDotbookStyle;
  /** Archivo dentro de public/dotbook-templates (y de thumbs/). */
  file: string;
  /** Cómo se llama en el selector. */
  label: string;
  /**
   * Celebración con la que se agrupa en el selector. Va escrito aquí y no
   * deducido del identificador: `realBabyShower` y `realBautizo` empiezan
   * igual, y adivinarlo por el nombre acababa colocando portadas en la
   * pestaña equivocada.
   */
  grupo: Exclude<TemplateCoverGroup, "todas">;
  /**
   * Color del diseño, en 0–1. Lo heredan las páginas siguientes (fondo,
   * marco, rama decorativa) para que el libro entero vaya a juego.
   */
  accent: [number, number, number];
};

export const TEMPLATE_COVER_LIST: TemplateCoverMeta[] = [
  { id: "realGeneral", grupo: "otras", file: "general.jpg", label: "Recuerdos en general", accent: [0.62, 0.55, 0.42] },

  // Familia.
  { id: "realFamilia", grupo: "familia", file: "familia.jpg", label: "Familia · clásica", accent: [0.5, 0.38, 0.25] },
  { id: "realFamiliaManos", grupo: "familia", file: "familia-manos.jpg", label: "Familia · montaña", accent: [0.32, 0.38, 0.45] },
  { id: "realFamiliaCampo", grupo: "familia", file: "familia-campo.jpg", label: "Familia · campo", accent: [0.55, 0.46, 0.3] },
  { id: "realFamiliaFlores", grupo: "familia", file: "familia-flores.jpg", label: "Familia · flores", accent: [0.63, 0.42, 0.28] },
  { id: "realFamiliaPolaroids", grupo: "familia", file: "familia-polaroids.jpg", label: "Familia · polaroids", accent: [0.5, 0.42, 0.36] },
  { id: "realFamiliaIlustrada", grupo: "familia", file: "familia-ilustrada.jpg", label: "Familia · ilustrada", accent: [0.26, 0.33, 0.45] },

  // Boda: varios diseños, desde el clásico con foto hasta los ilustrados.
  { id: "realBoda", grupo: "boda", file: "boda.jpg", label: "Boda · clásica", accent: [0.44, 0.13, 0.18] },
  { id: "realBodaCorazon", grupo: "boda", file: "boda-corazon.jpg", label: "Boda · corazón", accent: [0.55, 0.35, 0.35] },
  { id: "realBodaCeremonia", grupo: "boda", file: "boda-ceremonia.jpg", label: "Boda · ceremonia", accent: [0.42, 0.47, 0.38] },
  { id: "realBodaMomentos", grupo: "boda", file: "boda-momentos.jpg", label: "Boda · momentos", accent: [0.75, 0.5, 0.52] },
  { id: "realBodaFlores", grupo: "boda", file: "boda-flores.jpg", label: "Boda · flores", accent: [0.72, 0.45, 0.25] },
  { id: "realBodaAzul", grupo: "boda", file: "boda-azul.jpg", label: "Boda · flores azules", accent: [0.35, 0.45, 0.66] },

  // Quinceañera: varios diseños para elegir, que es la celebración donde más
  // se cuida la estética y con una sola portada no había dónde escoger.
  { id: "realQuince", grupo: "quince", file: "quince.png", label: "Quinceañera · tarta rosa", accent: [0.9, 0.46, 0.66] },
  { id: "realQuinceFlores", grupo: "quince", file: "quince-flores.jpg", label: "Quinceañera · flores", accent: [0.42, 0.14, 0.34] },
  { id: "realQuinceVestido", grupo: "quince", file: "quince-vestido.jpg", label: "Quinceañera · vestido", accent: [0.85, 0.52, 0.33] },
  { id: "realQuinceRosasMarco", grupo: "quince", file: "quince-rosas-marco.png", label: "Quinceañera · rosas", accent: [0.9, 0.46, 0.66] },
  { id: "realQuinceMariposas", grupo: "quince", file: "quince-mariposas.jpg", label: "Quinceañera · mariposas", accent: [0.55, 0.38, 0.68] },
  { id: "realQuincePrincesa", grupo: "quince", file: "quince-princesa.jpg", label: "Quinceañera · princesa", accent: [0.84, 0.54, 0.62] },

  { id: "realGraduacion", grupo: "otras", file: "graduacion.jpg", label: "Graduación", accent: [0.16, 0.21, 0.35] },

  // Primera comunión: seis diseños, en rosa y en azul.
  { id: "realComunion", grupo: "comunion", file: "comunion.jpg", label: "Primera comunión · clásica", accent: [0.72, 0.58, 0.32] },
  { id: "realComunionFlores", grupo: "comunion", file: "comunion-flores.jpg", label: "Primera comunión · flores", accent: [0.82, 0.46, 0.55] },
  { id: "realComunionNina", grupo: "comunion", file: "comunion-nina.jpg", label: "Primera comunión · niña", accent: [0.74, 0.42, 0.4] },
  { id: "realComunionNino", grupo: "comunion", file: "comunion-nino.jpg", label: "Primera comunión · niño", accent: [0.34, 0.5, 0.72] },
  { id: "realComunionCorona", grupo: "comunion", file: "comunion-corona.jpg", label: "Primera comunión · corona", accent: [0.78, 0.34, 0.55] },
  { id: "realComunionIglesia", grupo: "comunion", file: "comunion-iglesia.jpg", label: "Primera comunión · iglesia", accent: [0.28, 0.4, 0.6] },


  // Bautizo: seis diseños, del clásico a los ilustrados en tonos celestes.
  { id: "realBautizo", grupo: "bautizo", file: "bautizo.jpg", label: "Bautizo · clásico", accent: [0.76, 0.59, 0.47] },
  { id: "realBautizoCorona", grupo: "bautizo", file: "bautizo-corona.jpg", label: "Bautizo · corona", accent: [0.5, 0.52, 0.36] },
  { id: "realBautizoPaloma", grupo: "bautizo", file: "bautizo-paloma.jpg", label: "Bautizo · paloma", accent: [0.66, 0.52, 0.28] },
  { id: "realBautizoMarmol", grupo: "bautizo", file: "bautizo-marmol.jpg", label: "Bautizo · mármol", accent: [0.6, 0.52, 0.3] },
  { id: "realBautizoCeleste", grupo: "bautizo", file: "bautizo-celeste.jpg", label: "Bautizo · celeste", accent: [0.38, 0.52, 0.7] },
  { id: "realBautizoAngel", grupo: "bautizo", file: "bautizo-angel.jpg", label: "Bautizo · angelito", accent: [0.3, 0.42, 0.62] },


  // Baby shower: seis diseños, en rosa, azul y neutro para quien no quiere
  // decir todavía si es niño o niña.
  { id: "realBabyShower", grupo: "baby", file: "babyshower.jpg", label: "Baby shower · clásico", accent: [0.5, 0.62, 0.72] },
  { id: "realBabyKoala", grupo: "baby", file: "baby-koala.jpg", label: "Baby shower · koala", accent: [0.85, 0.42, 0.55] },
  { id: "realBabyOvejita", grupo: "baby", file: "baby-ovejita.jpg", label: "Baby shower · ovejita", accent: [0.36, 0.5, 0.72] },
  { id: "realBabyNina", grupo: "baby", file: "baby-nina.jpg", label: "Baby shower · niña", accent: [0.8, 0.5, 0.5] },
  { id: "realBabyNino", grupo: "baby", file: "baby-nino.jpg", label: "Baby shower · niño", accent: [0.3, 0.44, 0.62] },
  { id: "realBabyDormido", grupo: "baby", file: "baby-dormido.jpg", label: "Baby shower · bebé dormido", accent: [0.55, 0.58, 0.38] },


  // Fiesta infantil: seis diseños, de la portada sobria con marco para la foto
  // a las ilustradas a todo color.
  { id: "realFiestaInfantil", grupo: "cumple", file: "fiestainfantil.jpg", label: "Fiesta infantil · clásica", accent: [0.87, 0.56, 0.34] },
  { id: "realCumpleSencilla", grupo: "cumple", file: "cumple-sencilla.jpg", label: "Fiesta infantil · sencilla", accent: [0.28, 0.6, 0.62] },
  { id: "realCumpleNina", grupo: "cumple", file: "cumple-nina.jpg", label: "Fiesta infantil · niña", accent: [0.55, 0.36, 0.62] },
  { id: "realCumpleOsito", grupo: "cumple", file: "cumple-osito.jpg", label: "Fiesta infantil · osito", accent: [0.5, 0.3, 0.62] },
  { id: "realCumpleArcoiris", grupo: "cumple", file: "cumple-arcoiris.jpg", label: "Fiesta infantil · arcoíris", accent: [0.45, 0.32, 0.66] },
  { id: "realCumpleNino", grupo: "cumple", file: "cumple-nino.jpg", label: "Fiesta infantil · niño", accent: [0.18, 0.38, 0.68] },


  // Viajes: seis diseños, del cuaderno de cuero al dibujo del coche cargado.
  { id: "realViajes", grupo: "viajes", file: "viajes.jpg", label: "Viajes · clásico", accent: [0.74, 0.44, 0.2] },
  { id: "realViajesVintage", grupo: "viajes", file: "viajes-vintage.jpg", label: "Viajes · cuaderno de cuero", accent: [0.45, 0.34, 0.2] },
  { id: "realViajesPolaroid", grupo: "viajes", file: "viajes-polaroid.jpg", label: "Viajes · polaroid", accent: [0.4, 0.3, 0.18] },
  { id: "realViajesAventuras", grupo: "viajes", file: "viajes-aventuras.jpg", label: "Viajes · aventuras", accent: [0.2, 0.28, 0.42] },
  { id: "realViajesCoche", grupo: "viajes", file: "viajes-coche.jpg", label: "Viajes · en coche", accent: [0.32, 0.58, 0.6] },
  { id: "realViajesPostales", grupo: "viajes", file: "viajes-postales.jpg", label: "Viajes · postales", accent: [0.55, 0.45, 0.25] },

  { id: "realNavidad", grupo: "otras", file: "navidad.jpg", label: "Navidad", accent: [0.48, 0.1, 0.12] },
  { id: "realAnoNuevo", grupo: "otras", file: "anonuevo.jpg", label: "Año nuevo", accent: [0.68, 0.55, 0.28] },
];

export const TEMPLATE_COVERS_BY_ID = Object.fromEntries(
  TEMPLATE_COVER_LIST.map((t) => [t.id, t]),
) as Record<TemplateDotbookStyle, TemplateCoverMeta>;

export function isTemplateDotbookStyle(value: string): value is TemplateDotbookStyle {
  return Object.prototype.hasOwnProperty.call(TEMPLATE_COVERS_BY_ID, value);
}
