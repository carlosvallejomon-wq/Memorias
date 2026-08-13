import {
  PDFDocument,
  PDFFont,
  PDFPage,
  PDFImage,
  rgb,
  RGB,
  StandardFonts,
  degrees,
  pushGraphicsState,
  popGraphicsState,
  rectangle as rectangleOp,
  clip as clipOp,
  endPath as endPathOp,
  translate as translateOp,
  rotateDegrees as rotateOp,
  scale as scaleOp,
} from "pdf-lib";
import QRCode from "qrcode";
import type { albums, media } from "@/db/schema";
import { EMOJI_A_ICONO, ICONOS } from "@/lib/dotbook-icons";
import {
  cabeDePie,
  formaDe,
  repartirEnPaginas,
  type CandidataMosaico,
} from "@/lib/dotbook-mosaico";
import {
  TEMPLATE_COVER_LIST,
  isTemplateDotbookStyle,
  type TemplateCoverMeta,
  type TemplateDotbookStyle,
} from "@/lib/dotbook-templates";

const PAGE_WIDTH = 595; // A4 a 72dpi
const PAGE_HEIGHT = 842;
const MARGIN = 50;

const INK = rgb(0.17, 0.13, 0.09);
const INK_SOFT = rgb(0.4, 0.35, 0.3);
const INK_FAINT = rgb(0.55, 0.5, 0.45);
const CREAM = rgb(0.98, 0.96, 0.94);
const SAND = rgb(0.94, 0.9, 0.85);
const TERRACOTTA = rgb(0.76, 0.34, 0.11);
const OLIVE = rgb(0.42, 0.46, 0.32);

// Estilos de portada del Dotbook dibujados con formas vectoriales, inspirados
// en plantillas de referencia (familia/cálido con borde floral, elegante
// boda-graduación, fiesta infantil, gala oscura y dorada tipo "Mis 15 años").
export type VectorDotbookStyle = "clasico" | "elegante" | "fiesta" | "gala" | "navidad" | "viajes";

export const VECTOR_DOTBOOK_STYLES: { id: VectorDotbookStyle; label: string }[] = [
  { id: "clasico", label: "Cálido floral" },
  { id: "elegante", label: "Elegante" },
  { id: "fiesta", label: "Fiesta" },
  { id: "gala", label: "Gala dorada" },
  { id: "navidad", label: "Navideño" },
  { id: "viajes", label: "Viajes" },
];

// Estilos de portada que usan los diseños reales (sin personas) que el
// usuario creó en Canva, incrustados tal cual como imagen de fondo — no
// recreados vectorialmente. Cada uno trae un color de acento propio, que
// las páginas de foto siguientes heredan para el fondo, la sombra y el
// margen, así todo el Dotbook queda a juego con la portada real.
export type { TemplateDotbookStyle };

type TemplateCoverConfig = Omit<TemplateCoverMeta, "accent"> & { accent: RGB };

// El catálogo vive en dotbook-templates.ts (compartido con el selector del
// navegador); aquí solo se pasa el color al tipo que entiende pdf-lib.
const TEMPLATE_COVERS = Object.fromEntries(
  TEMPLATE_COVER_LIST.map((t) => [t.id, { ...t, accent: rgb(...t.accent) }]),
) as Record<TemplateDotbookStyle, TemplateCoverConfig>;

export const TEMPLATE_DOTBOOK_STYLES: { id: TemplateDotbookStyle; label: string }[] =
  TEMPLATE_COVER_LIST.map((t) => ({ id: t.id, label: t.label }));

export type DotbookStyle = VectorDotbookStyle | TemplateDotbookStyle;

export const DOTBOOK_STYLES: { id: DotbookStyle; label: string }[] = [
  ...TEMPLATE_DOTBOOK_STYLES,
  ...VECTOR_DOTBOOK_STYLES,
];

function isTemplateStyle(style: DotbookStyle): style is TemplateDotbookStyle {
  return isTemplateDotbookStyle(style);
}

/** Páginas de recuerdo como mucho, para que el PDF se genere y se pueda abrir. */
export const MAX_DOTBOOK_PAGES = 220;

/**
 * Escoge `n` elementos repartidos de principio a fin de la lista. Así el libro
 * cuenta el evento entero (llegada, ceremonia, fiesta) en vez de quedarse
 * atascado en la primera hora.
 */
function pickSpread<T>(list: T[], n: number): T[] {
  if (list.length <= n) return list;
  const paso = list.length / n;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(list[Math.floor(i * paso)]);
  return out;
}

function mix(a: RGB, b: RGB, t: number): RGB {
  return rgb(
    a.red + (b.red - a.red) * t,
    a.green + (b.green - a.green) * t,
    a.blue + (b.blue - a.blue) * t,
  );
}

// Construye una paleta para las páginas de foto/cierre a partir del color de
// acento de un diseño de portada real, para que hereden su color de fondo,
// sombra y margen sin tener que definir una paleta a mano por cada uno.
function paletteFromAccent(accent: RGB): Palette {
  const white = rgb(1, 1, 1);
  const near_black = rgb(0.08, 0.07, 0.06);
  const ink = mix(accent, near_black, 0.55);
  return {
    bg: mix(accent, white, 0.9),
    bgClosing: mix(accent, white, 0.8),
    ink,
    inkSoft: mix(ink, white, 0.35),
    inkFaint: mix(ink, white, 0.55),
    accent,
    tapeColors: [accent, mix(accent, near_black, 0.3)],
    branch: accent,
    decoration: "branch",
  };
}

type Palette = {
  bg: RGB;
  bgGradient?: [RGB, RGB];
  bgClosing: RGB;
  ink: RGB;
  inkSoft: RGB;
  inkFaint: RGB;
  accent: RGB;
  tapeColors: RGB[];
  branch: RGB;
  decoration: "branch" | "confetti" | "postal";
  flowerColors?: RGB[];
  mandala?: boolean;
  botanical?: PDFImage;
};

const PALETTES: Record<VectorDotbookStyle, Palette> = {
  clasico: {
    bg: CREAM,
    bgClosing: SAND,
    ink: INK,
    inkSoft: INK_SOFT,
    inkFaint: INK_FAINT,
    accent: TERRACOTTA,
    tapeColors: [TERRACOTTA, OLIVE, rgb(0.7, 0.55, 0.3), TERRACOTTA],
    branch: OLIVE,
    decoration: "branch",
    flowerColors: [
      rgb(0.89, 0.42, 0.38),
      rgb(0.93, 0.6, 0.72),
      rgb(0.6, 0.48, 0.75),
      rgb(0.95, 0.75, 0.4),
    ],
  },
  elegante: {
    bg: rgb(0.95, 0.95, 0.96),
    bgClosing: rgb(0.91, 0.91, 0.93),
    ink: rgb(0.13, 0.16, 0.24),
    inkSoft: rgb(0.32, 0.36, 0.44),
    inkFaint: rgb(0.5, 0.53, 0.58),
    accent: rgb(0.7, 0.56, 0.27),
    tapeColors: [
      rgb(0.7, 0.56, 0.27),
      rgb(0.16, 0.22, 0.36),
      rgb(0.7, 0.56, 0.27),
      rgb(0.16, 0.22, 0.36),
    ],
    branch: rgb(0.7, 0.56, 0.27),
    decoration: "branch",
  },
  fiesta: {
    bg: rgb(1, 0.97, 0.94),
    bgClosing: rgb(1, 0.94, 0.9),
    ink: rgb(0.3, 0.16, 0.34),
    inkSoft: rgb(0.5, 0.3, 0.45),
    inkFaint: rgb(0.62, 0.48, 0.58),
    accent: rgb(0.86, 0.29, 0.47),
    tapeColors: [
      rgb(0.86, 0.29, 0.47),
      rgb(0.26, 0.66, 0.6),
      rgb(0.95, 0.71, 0.22),
      rgb(0.55, 0.42, 0.75),
    ],
    branch: rgb(0.86, 0.29, 0.47),
    decoration: "confetti",
  },
  gala: {
    bg: rgb(0.16, 0.13, 0.06),
    bgGradient: [rgb(0.08, 0.07, 0.05), rgb(0.42, 0.32, 0.1)],
    bgClosing: rgb(0.1, 0.08, 0.05),
    ink: rgb(0.96, 0.9, 0.75),
    inkSoft: rgb(0.82, 0.72, 0.5),
    inkFaint: rgb(0.65, 0.57, 0.42),
    accent: rgb(0.78, 0.62, 0.32),
    tapeColors: [
      rgb(0.78, 0.62, 0.32),
      rgb(0.6, 0.46, 0.22),
      rgb(0.78, 0.62, 0.32),
      rgb(0.6, 0.46, 0.22),
    ],
    branch: rgb(0.78, 0.62, 0.32),
    decoration: "branch",
    mandala: true,
  },
  navidad: {
    bg: CREAM,
    bgClosing: rgb(0.94, 0.9, 0.85),
    ink: rgb(0.15, 0.09, 0.09),
    inkSoft: rgb(0.38, 0.28, 0.26),
    inkFaint: rgb(0.55, 0.46, 0.44),
    accent: rgb(0.55, 0.12, 0.14),
    tapeColors: [
      rgb(0.55, 0.12, 0.14),
      rgb(0.16, 0.35, 0.2),
      rgb(0.78, 0.62, 0.32),
      rgb(0.16, 0.35, 0.2),
    ],
    branch: rgb(0.16, 0.35, 0.2),
    decoration: "branch",
  },
  viajes: {
    bg: rgb(0.94, 0.91, 0.85),
    bgClosing: rgb(0.89, 0.85, 0.77),
    ink: rgb(0.2, 0.16, 0.12),
    inkSoft: rgb(0.42, 0.35, 0.28),
    inkFaint: rgb(0.58, 0.5, 0.42),
    accent: rgb(0.78, 0.42, 0.18),
    tapeColors: [
      rgb(0.78, 0.42, 0.18),
      rgb(0.35, 0.42, 0.48),
      rgb(0.78, 0.42, 0.18),
      rgb(0.35, 0.42, 0.48),
    ],
    branch: rgb(0.78, 0.42, 0.18),
    decoration: "postal",
  },
};

function mulberry32(seed: number) {
  return function random() {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function formatLongDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

type Album = typeof albums.$inferSelect;
type MediaItem = typeof media.$inferSelect;

export type DotbookMessage = {
  authorName: string | null;
  body: string;
  createdAt: Date;
};

export type DotbookExtras = {
  commentsByMedia: Map<string, string[]>;
  reactionCountByMedia: Map<string, number>;
  // Dedicatorias del muro de mensajes: se imprimen en sus propias páginas,
  // justo antes del cierre del libro.
  messages: DotbookMessage[];
  shareUrl: string;
  // Origen (protocolo+host) para poder buscar los diseños de portada reales
  // en /public/dotbook-templates — solo hace falta para los estilos
  // TemplateDotbookStyle.
  baseUrl: string;
};

type Fonts = { bold: PDFFont; regular: PDFFont; italic: PDFFont };

/**
 * Deja el texto en caracteres que las fuentes del PDF saben escribir.
 *
 * Las fuentes estándar de pdf-lib usan WinAnsi, que cubre el español entero
 * pero no los emoji ni los símbolos raros. Y no los ignora: **lanza una
 * excepción**. Como los comentarios y las dedicatorias los escriben los
 * invitados desde el móvil, con un solo "❤️" en un comentario la descarga del
 * Dotbook entero se caía con un error 500 — justo el día del evento y sin que
 * el organizador pudiera hacer nada.
 *
 * Lo que no se puede escribir se quita. Las tildes, la eñe y los signos de
 * apertura se quedan como están. Los emoji que escriben los invitados no se
 * pierden por el camino: se sacan aparte antes de limpiar y se dibujan como
 * iconos (ver `trocearTexto`).
 */
function limpiarTexto(text: string): string {
  // Fuera los selectores de variante y los "juntadores" antes de nada: sin
  // esto, un corazón son dos puntos de código y salía duplicado.
  // Lo que quede fuera de WinAnsi (emoji sin icono, alfabetos no latinos,
  // comillas exóticas) se cae, y con él el espacio que lo precede, para no
  // dejar un hueco doble en mitad de la frase. Ojo con colapsar espacios a lo
  // bruto: eso se cargaba el "M E M O R I A S   V I V A S" del encabezado,
  // que lleva los espacios de más a propósito.
  return text
    .replace(/[\u{FE0E}\u{FE0F}\u{200D}]/gu, "")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ ?[^ -ÿ€‚ƒ†‡ˆ‰ŠŽŒ]+/g, "");
}

export function textoParaPdf(text: string): string {
  return limpiarTexto(text).trim();
}

/**
 * Un texto partido en lo que se escribe con la fuente y lo que se dibuja.
 *
 * La primera solución a los emoji fue cambiarlos por su equivalente escrito
 * (un corazón por "<3"), y funcionaba, pero impreso en un libro de recuerdos
 * eso se lee como un mensaje de móvil, no como un álbum.
 *
 * Ahora los emoji conocidos se sacan del texto y se dibujan a trazo, del mismo
 * color que la frase que los rodea (`src/lib/dotbook-icons.ts`). Los que no
 * tienen icono se siguen quitando: mejor una frase limpia que un cuadrado.
 */
type Trozo =
  | { tipo: "texto"; texto: string }
  | { tipo: "icono"; icono: keyof typeof ICONOS };

export function trocearTexto(text: string): Trozo[] {
  const sinVariantes = text.replace(/[\u{FE0E}\u{FE0F}\u{200D}]/gu, "");
  const trozos: Trozo[] = [];
  let pendiente = "";

  const soltar = () => {
    const limpio = limpiarTexto(pendiente);
    if (limpio) trozos.push({ tipo: "texto", texto: limpio });
    pendiente = "";
  };

  for (const caracter of sinVariantes) {
    const icono = EMOJI_A_ICONO[caracter];
    if (icono) {
      soltar();
      trozos.push({ tipo: "icono", icono });
    } else {
      pendiente += caracter;
    }
  }
  soltar();

  // Nada de espacios sueltos en los extremos: al sacar un emoji del final de
  // la frase se queda el hueco que lo separaba de la última palabra.
  const soloEspacios = (t: Trozo | undefined) => t?.tipo === "texto" && t.texto.trim() === "";
  const primero = trozos[0];
  if (trozos.length === 1 && primero.tipo === "texto") {
    const solo = primero.texto.trim();
    return solo ? [{ tipo: "texto", texto: solo }] : [];
  }
  while (soloEspacios(trozos[0])) trozos.shift();
  while (soloEspacios(trozos[trozos.length - 1])) trozos.pop();
  return trozos;
}

/**
 * Cómo se sienta un icono dentro de una línea de texto, en veces el tamaño de
 * la letra. A tamaño completo sobresalía por encima de las mayúsculas y
 * parecía pegado de otro sitio; así ocupa de la línea base a la altura de las
 * mayúsculas, como una letra más.
 */
const ANCHO_ICONO = 0.95;
const ALTO_ICONO = 0.78;
const TECHO_ICONO = 0.74;

function anchoTrozo(t: Trozo, font: PDFFont, size: number): number {
  return t.tipo === "icono" ? size * ANCHO_ICONO : font.widthOfTextAtSize(t.texto, size);
}

function anchoTrozos(trozos: Trozo[], font: PDFFont, size: number): number {
  return trozos.reduce((total, t) => total + anchoTrozo(t, font, size), 0);
}

function dibujarIcono(
  page: PDFPage,
  nombre: keyof typeof ICONOS,
  x: number,
  yBase: number,
  size: number,
  color: RGB,
) {
  const icono = ICONOS[nombre];
  if (!icono) return;
  const escala = (size * ALTO_ICONO) / 24;
  // `drawSvgPath` toma la esquina de arriba y dibuja hacia abajo, al revés que
  // el texto, que se apoya en su línea base. De ahí el desplazamiento.
  const arriba = yBase + size * TECHO_ICONO;
  const x0 = x + size * 0.08;
  if (icono.relleno) {
    page.drawSvgPath(icono.relleno, { x: x0, y: arriba, scale: escala, color, borderWidth: 0 });
  }
  if (icono.trazo) {
    page.drawSvgPath(icono.trazo, {
      x: x0,
      y: arriba,
      scale: escala,
      borderColor: color,
      borderWidth: (icono.grosor ?? 1.3) * escala,
    });
  }
}

function dibujarTrozos(
  page: PDFPage,
  trozos: Trozo[],
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
) {
  let cursor = x;
  for (const t of trozos) {
    if (t.tipo === "icono") dibujarIcono(page, t.icono, cursor, y, size, color);
    else if (t.texto.trim()) page.drawText(t.texto, { x: cursor, y, size, font, color });
    cursor += anchoTrozo(t, font, size);
  }
}

/**
 * Parte una frase con iconos en líneas que caben en `maxWidth`.
 *
 * Se trocea por espacios pero conservándolos como piezas propias, en vez de
 * volver a unir con un espacio simple: así los espacios que alguien puso a
 * propósito siguen donde estaban.
 */
function partirTrozos(trozos: Trozo[], maxWidth: number, font: PDFFont, size: number): Trozo[][] {
  const piezas: Trozo[] = [];
  for (const t of trozos) {
    if (t.tipo === "icono") {
      piezas.push(t);
      continue;
    }
    for (const parte of t.texto.split(/(\n|[ \t]+)/)) {
      if (parte) piezas.push({ tipo: "texto", texto: parte });
    }
  }

  const lineas: Trozo[][] = [];
  let linea: Trozo[] = [];
  let ancho = 0;
  const cerrar = () => {
    lineas.push(linea);
    linea = [];
    ancho = 0;
  };

  for (const pieza of piezas) {
    if (pieza.tipo === "texto" && pieza.texto === "\n") {
      cerrar();
      continue;
    }
    const w = anchoTrozo(pieza, font, size);
    if (ancho + w > maxWidth && linea.length > 0) {
      cerrar();
      // Un espacio justo donde se parte la línea no se arrastra al principio
      // de la siguiente: dejaría la primera palabra sangrada.
      if (pieza.tipo === "texto" && pieza.texto.trim() === "") continue;
    }
    linea.push(pieza);
    ancho += w;
  }
  cerrar();

  return lineas;
}

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
  /** Centro horizontal. Por defecto el de la página. */
  centerX = PAGE_WIDTH / 2,
) {
  const limpio = textoParaPdf(text);
  const width = font.widthOfTextAtSize(limpio, size);
  page.drawText(limpio, { x: centerX - width / 2, y, size, font, color });
}

/** Parte un texto —con sus emoji hechos icono— en líneas de `maxWidth`. */
function envolver(text: string, maxWidth: number, font: PDFFont, size: number): Trozo[][] {
  return partirTrozos(trocearTexto(text), maxWidth, font, size);
}

// Envuelve texto a un ancho máximo; devuelve la posición y tras la última línea.
function drawWrapped(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  font: PDFFont,
  size: number,
  color: RGB,
  align: "left" | "center" = "left",
): number {
  const lines = envolver(text, maxWidth, font, size);
  lines.forEach((l, i) => {
    const lx = align === "center" ? x - anchoTrozos(l, font, size) / 2 : x;
    dibujarTrozos(page, l, lx, y - i * lineHeight, font, size, color);
  });
  return y - (lines.length - 1) * lineHeight;
}

function drawDivider(page: PDFPage, y: number, color: RGB) {
  const halfGap = 14;
  page.drawLine({
    start: { x: PAGE_WIDTH / 2 - 90, y },
    end: { x: PAGE_WIDTH / 2 - halfGap, y },
    thickness: 1,
    color,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: PAGE_WIDTH / 2 + halfGap, y },
    end: { x: PAGE_WIDTH / 2 + 90, y },
    thickness: 1,
    color,
    opacity: 0.6,
  });
  page.drawEllipse({ x: PAGE_WIDTH / 2, y, xScale: 3, yScale: 3, color });
}

// Recorte real (no un truco de escalado): todo lo que se dibuje entre
// clipRect/unclip queda cortado exactamente al rectángulo dado, así una
// imagen con "cover fit" nunca se sale de su marco.
function clipRect(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.pushOperators(pushGraphicsState(), rectangleOp(x, y, w, h), clipOp(), endPathOp());
}
function unclip(page: PDFPage) {
  page.pushOperators(popGraphicsState());
}

// Marco tipo "paspartú" con sombra, del mismo tamaño exacto que el marco
// (antes la sombra y la imagen podían quedar de tamaños distintos). El
// borde usa un color de la paleta más intenso que el fondo de la página,
// para que cada página de foto quede a juego con la portada.
function drawFrame(page: PDFPage, x: number, y: number, w: number, h: number, borderColor: RGB) {
  page.drawRectangle({ x: x + 3, y: y - 4, width: w, height: h, color: rgb(0.12, 0.1, 0.08), opacity: 0.1 });
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x: x + 0.5,
    y: y + 0.5,
    width: w - 1,
    height: h - 1,
    borderColor,
    borderWidth: 0.7,
    borderOpacity: 0.65,
  });
}

// Degradado vertical aproximado por bandas — pdf-lib no tiene una API de
// alto nivel para rellenos con degradado, así que se simula con franjas
// horizontales muy finas que interpolan entre dos colores.
function drawGradientBg(page: PDFPage, top: RGB, bottom: RGB, steps = 56) {
  const bandH = PAGE_HEIGHT / steps + 1;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const color = rgb(
      top.red + (bottom.red - top.red) * t,
      top.green + (bottom.green - top.green) * t,
      top.blue + (bottom.blue - top.blue) * t,
    );
    page.drawRectangle({
      x: 0,
      y: PAGE_HEIGHT - (i + 1) * bandH,
      width: PAGE_WIDTH,
      height: bandH,
      color,
    });
  }
}

function drawBackground(page: PDFPage, palette: Palette) {
  if (palette.bgGradient) {
    drawGradientBg(page, palette.bgGradient[0], palette.bgGradient[1]);
  } else {
    page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: palette.bg });
  }
}

// Una florecita sencilla (pétalos + centro) para el borde tipo "pradera"
// del estilo clásico, inspirado en la plantilla floral de referencia.
function drawFlower(page: PDFPage, x: number, y: number, size: number, petal: RGB, center: RGB) {
  const petalPositions = [
    [0, size],
    [size * 0.87, size * 0.5],
    [size * 0.87, -size * 0.5],
    [0, -size],
    [-size * 0.87, -size * 0.5],
    [-size * 0.87, size * 0.5],
  ];
  for (const [dx, dy] of petalPositions) {
    page.drawEllipse({
      x: x + dx * 0.55,
      y: y + dy * 0.55,
      xScale: size * 0.55,
      yScale: size * 0.38,
      rotate: degrees((Math.atan2(dy, dx) * 180) / Math.PI),
      color: petal,
      opacity: 0.75,
    });
  }
  page.drawEllipse({ x, y, xScale: size * 0.32, yScale: size * 0.32, color: center, opacity: 0.9 });
}

// Borde inferior tipo "pradera de flores", a juego con la plantilla floral
// que sirvió de referencia — una fila de florecitas de colores variados con
// pequeños tallos, en vez de una simple rama de esquina.
function drawFloralBorder(page: PDFPage, y: number, colors: RGB[], seed: number) {
  const rng = mulberry32(seed);
  const stemColor = rgb(0.55, 0.6, 0.42);
  let x = 30;
  while (x < PAGE_WIDTH - 20) {
    const size = 7 + rng() * 6;
    const lift = rng() * 14;
    page.drawLine({
      start: { x, y: y - 4 },
      end: { x, y: y - 4 + lift },
      thickness: 1.5,
      color: stemColor,
      opacity: 0.5,
    });
    const petal = colors[Math.floor(rng() * colors.length)];
    drawFlower(page, x, y + lift, size, petal, rgb(0.98, 0.85, 0.4));
    x += size * 2 + 14 + rng() * 12;
  }
}

// Abanico de ramas doradas radiando desde un punto, a juego con el mandala
// de la plantilla oscura de referencia ("Mis 15 años").
function drawMandalaBurst(page: PDFPage, cx: number, cy: number, color: RGB) {
  const angles = [-80, -55, -32, -12, 12, 32, 55, 80];
  for (const a of angles) {
    drawCornerBranch(page, cx, cy, a - 90, 95, a < 0, color);
  }
  page.drawLine({
    start: { x: cx - 130, y: cy },
    end: { x: cx - 22, y: cy },
    thickness: 1,
    color,
    opacity: 0.6,
  });
  page.drawLine({
    start: { x: cx + 22, y: cy },
    end: { x: cx + 130, y: cy },
    thickness: 1,
    color,
    opacity: 0.6,
  });
}

// Dibuja la imagen ajustada "cover" (recortando el sobrante) dentro de un
// rectángulo, usando recorte real para que nunca desborde el marco.
function drawImageCover(
  page: PDFPage,
  image: PDFImage,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  clipRect(page, x, y, w, h);
  const scale = Math.max(w / image.width, h / image.height);
  const iw = image.width * scale;
  const ih = image.height * scale;
  page.drawImage(image, { x: x + (w - iw) / 2, y: y + (h - ih) / 2, width: iw, height: ih });
  unclip(page);
}

async function embedQr(pdf: PDFDocument, url: string, size = 400) {
  const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: size });
  const bytes = Buffer.from(dataUrl.split(",")[1], "base64");
  return pdf.embedPng(bytes);
}

async function tryEmbedImage(pdf: PDFDocument, url: string, descargada?: Descarga | null) {
  try {
    const datos = descargada ?? (await descargar(url));
    if (!datos) return null;
    return datos.esPng ? await pdf.embedPng(datos.bytes) : await pdf.embedJpg(datos.bytes);
  } catch (err) {
    console.error("No se pudo incrustar la imagen en el Dotbook:", err);
    return null;
  }
}

/**
 * Carga una portada de plantilla LEYÉNDOLA DEL DISCO, no por internet.
 *
 * Antes el servidor se pedía la imagen a su propia web
 * (`https://…/dotbook-templates/boda.jpg`). En los despliegues de vista
 * previa, que Vercel protege con contraseña, esa petición volvía con la
 * pantalla de acceso en vez de la foto: la portada bonita fallaba en silencio
 * y el libro salía con el diseño antiguo. Leyendo del disco no hay petición
 * que pueda fallar, y además se ahorra una espera.
 */
async function leerPlantilla(file: string): Promise<Uint8Array | null> {
  // Nombre de archivo fijo, nunca viene del usuario, pero se recorta a la
  // última parte por si acaso.
  const nombre = file.split("/").pop() ?? "";
  try {
    const { readFile } = await import("node:fs/promises");
    const { join } = await import("node:path");
    const bytes = await readFile(join(process.cwd(), "public", "dotbook-templates", nombre));
    return new Uint8Array(bytes);
  } catch (err) {
    console.error(`No se pudo leer la portada de plantilla «${nombre}»:`, err);
    return null;
  }
}

/**
 * Dónde cabe la placa. `suciedad` es lo más marcado del dibujo que queda
 * debajo (0 = del todo limpio); es lo único que sirve para comparar dos
 * tamaños de placa, porque el `coste` con el que se elige la posición incluye
 * además las preferencias de sitio (abajo y centrada) y no dice nada de si
 * tapa algo.
 */
type Descarga = { bytes: Uint8Array; esPng: boolean };

/**
 * Lado máximo, en píxeles, con el que se incrusta cada foto en el PDF.
 *
 * En la página la foto ocupa como mucho unos 500x420 puntos, o sea unos
 * 1.400 px impresos a buena calidad. Meter el original de 12 megapíxeles no
 * se ve mejor y multiplica por veinte el peso del archivo: un libro de 60
 * fotos pasaba de 6 MB a 130 MB, y descargar eso desde un móvil es lo que
 * hacía que "el PDF tardara" aunque el servidor ya hubiera terminado.
 */
const FOTO_MAX_PX = 1400;

/** Cuántas fotos se reducen a la vez (hay ~4 núcleos en la función). */
const REDUCIR_A_LA_VEZ = 4;

async function descargar(url: string): Promise<Descarga | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const esPng = (res.headers.get("content-type") ?? "").includes("png");
    return await reducir(bytes, esPng);
  } catch (err) {
    console.error("No se pudo descargar la imagen del Dotbook:", err);
    return null;
  }
}

/**
 * Deja la foto en el tamaño en que se va a imprimir. Si algo falla (formato
 * raro, foto corrupta) se devuelve el original: más vale un libro pesado que
 * un libro sin esa foto.
 */
async function reducir(bytes: Uint8Array, esPng: boolean): Promise<Descarga> {
  try {
    const sharp = (await import("sharp")).default;
    const salida = await sharp(bytes)
      // `rotate()` sin argumentos aplica la orientación EXIF: sin esto, las
      // fotos hechas en vertical con el móvil salían tumbadas al reducirlas.
      .rotate()
      .resize({
        width: FOTO_MAX_PX,
        height: FOTO_MAX_PX,
        fit: "inside",
        withoutEnlargement: true,
      })
      // Un PNG con transparencia acabaría con el fondo negro al pasarlo a
      // JPG; sobre blanco queda como una foto normal impresa en papel.
      .flatten({ background: "#ffffff" })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
    return { bytes: new Uint8Array(salida), esPng: false };
  } catch (err) {
    console.error("No se pudo reducir una foto del Dotbook, se usa el original:", err);
    return { bytes, esPng };
  }
}

/**
 * Baja y prepara todas las fotos ANTES de montar las páginas, en tandas.
 *
 * Antes se descargaban de una en una, justo cuando le tocaba a cada página:
 * con 200 recuerdos eso son 200 esperas seguidas y el PDF tardaba una
 * eternidad (o se quedaba sin tiempo). Ahora se solapan, que es donde está
 * casi todo el tiempo de espera.
 *
 * El tamaño de tanda lo manda el reducido de fotos, no la descarga: reducir
 * usa el procesador, y lanzar veinte a la vez con cuatro núcleos solo hace
 * que se estorben entre ellas.
 */
async function descargarTodas(urls: string[]): Promise<Map<string, Descarga>> {
  const unicas = [...new Set(urls)];
  const cache = new Map<string, Descarga>();

  for (let i = 0; i < unicas.length; i += REDUCIR_A_LA_VEZ) {
    const tanda = unicas.slice(i, i + REDUCIR_A_LA_VEZ);
    const resultados = await Promise.all(tanda.map((u) => descargar(u)));
    tanda.forEach((u, j) => {
      const r = resultados[j];
      if (r) cache.set(u, r);
    });
  }
  return cache;
}

// Una "polaroid" rotada con washi tape, como en un scrapbook — se dibuja en
// un sistema de coordenadas local (origen abajo-a-la-izquierda de la
// tarjeta) que luego se traslada y rota como conjunto, así que todo gira
// junto sin descuadrarse.
function drawPolaroid(
  page: PDFPage,
  image: PDFImage,
  centerX: number,
  centerY: number,
  rotationDeg: number,
  tapeColor: RGB,
) {
  const pad = 12;
  const photoSize = 150;
  const bottomMargin = 46;
  const cardW = photoSize + pad * 2;
  const cardH = pad + photoSize + bottomMargin;

  page.pushOperators(
    pushGraphicsState(),
    translateOp(centerX, centerY),
    rotateOp(rotationDeg),
    translateOp(-cardW / 2, -cardH / 2),
  );

  // Sombra + tarjeta blanca.
  page.drawRectangle({
    x: 4,
    y: -4,
    width: cardW,
    height: cardH,
    color: rgb(0.2, 0.16, 0.1),
    opacity: 0.25,
  });
  page.drawRectangle({ x: 0, y: 0, width: cardW, height: cardH, color: rgb(1, 1, 1) });

  drawImageCover(page, image, pad, cardH - pad - photoSize, photoSize, photoSize);

  // Washi tape asomando por arriba.
  page.drawRectangle({
    x: cardW / 2 - 26,
    y: cardH - 14,
    width: 52,
    height: 22,
    color: tapeColor,
    opacity: 0.55,
    rotate: degrees(-6),
  });

  page.pushOperators(popGraphicsState());
}

// --- Rama de olivo decorativa -------------------------------------------
//
// Sustituye a las tres elipses sueltas de antes. Se dibuja como trazo
// vectorial (no como imagen), así que sale nítida a cualquier tamaño y, sobre
// todo, se puede pintar del color de la plantilla que haya elegido el
// organizador: la misma rama es dorada en la portada de boda y azul marino en
// la de graduación.

/** Punto de una curva de Bézier cúbica y su dirección en ese punto. */
function bezier(
  t: number,
  p: [number, number][],
): { x: number; y: number; ang: number } {
  const u = 1 - t;
  const b = [u * u * u, 3 * u * u * t, 3 * u * t * t, t * t * t];
  const d = [-3 * u * u, 3 * u * u - 6 * u * t, 6 * u * t - 3 * t * t, 3 * t * t];
  const x = p.reduce((s, q, i) => s + q[0] * b[i], 0);
  const y = p.reduce((s, q, i) => s + q[1] * b[i], 0);
  const dx = p.reduce((s, q, i) => s + q[0] * d[i], 0);
  const dy = p.reduce((s, q, i) => s + q[1] * d[i], 0);
  return { x, y, ang: Math.atan2(dy, dx) };
}

/** Una hoja alargada: dos curvas que se cierran en la punta. */
function hojaPath(bx: number, by: number, ang: number, largo: number, ancho: number): string {
  const tx = bx + Math.cos(ang) * largo;
  const ty = by + Math.sin(ang) * largo;
  const mx = (bx + tx) / 2;
  const my = (by + ty) / 2;
  const px = -Math.sin(ang) * ancho;
  const py = Math.cos(ang) * ancho;
  return (
    `M ${bx.toFixed(1)} ${by.toFixed(1)} ` +
    `Q ${(mx + px).toFixed(1)} ${(my + py).toFixed(1)} ${tx.toFixed(1)} ${ty.toFixed(1)} ` +
    `Q ${(mx - px).toFixed(1)} ${(my - py).toFixed(1)} ${bx.toFixed(1)} ${by.toFixed(1)} Z`
  );
}

// Tallo en coordenadas SVG (la y crece hacia abajo): sube desde abajo a la
// izquierda hasta arriba a la derecha, con una curva suave.
const TALLO: [number, number][] = [
  [8, 150],
  [22, 112],
  [16, 66],
  [46, 18],
];

// Dónde nace cada hoja a lo largo del tallo, hacia qué lado y de qué tamaño.
const HOJAS: { t: number; lado: 1 | -1; largo: number; sep: number }[] = [
  { t: 0.14, lado: -1, largo: 40, sep: 55 },
  { t: 0.3, lado: 1, largo: 34, sep: 50 },
  { t: 0.46, lado: -1, largo: 44, sep: 60 },
  { t: 0.6, lado: 1, largo: 38, sep: 52 },
  { t: 0.76, lado: -1, largo: 34, sep: 58 },
  { t: 0.9, lado: 1, largo: 30, sep: 48 },
];

function ramaPath(): string {
  const partes: string[] = [];

  // El tallo, como línea muy fina (se dibuja con relleno, así que se traza
  // como una cinta estrecha de ida y vuelta).
  const grosor = 0.9;
  const ida: string[] = [];
  const vuelta: string[] = [];
  for (let i = 0; i <= 24; i++) {
    const { x, y, ang } = bezier(i / 24, TALLO);
    const nx = -Math.sin(ang) * grosor;
    const ny = Math.cos(ang) * grosor;
    ida.push(`${(x + nx).toFixed(1)} ${(y + ny).toFixed(1)}`);
    vuelta.unshift(`${(x - nx).toFixed(1)} ${(y - ny).toFixed(1)}`);
  }
  partes.push(`M ${ida[0]} L ${ida.slice(1).join(" L ")} L ${vuelta.join(" L ")} Z`);

  for (const h of HOJAS) {
    const { x, y, ang } = bezier(h.t, TALLO);
    // La hoja sale del tallo abriéndose hacia su lado.
    const salida = ang + (h.lado * h.sep * Math.PI) / 180;
    partes.push(hojaPath(x, y, salida, h.largo, h.largo * 0.17));
  }

  return partes.join(" ");
}

// Vena central de cada hoja: una línea fina de la base a la punta, como en
// los dibujos botánicos a pluma que sirvieron de referencia. Se traza aparte
// del relleno (sin color de fondo, solo trazo) para que se note por encima.
function venasPath(): string {
  const partes: string[] = [];
  for (const h of HOJAS) {
    const { x, y, ang } = bezier(h.t, TALLO);
    const salida = ang + (h.lado * h.sep * Math.PI) / 180;
    const tx = x + Math.cos(salida) * h.largo * 0.88;
    const ty = y + Math.sin(salida) * h.largo * 0.88;
    partes.push(`M ${x.toFixed(1)} ${y.toFixed(1)} L ${tx.toFixed(1)} ${ty.toFixed(1)}`);
  }
  return partes.join(" ");
}

const RAMA_PATH = ramaPath();
const VENAS_PATH = venasPath();

/**
 * Dibuja la rama en la esquina. `scale` la reduce o agranda y `mirror` la
 * voltea para la esquina opuesta.
 */
function drawCornerBranch(
  page: PDFPage,
  x: number,
  y: number,
  angleDeg: number,
  length: number,
  mirror: boolean,
  color: RGB,
) {
  // El dibujo mide unos 150 de alto; `length` dice cuánto debe ocupar.
  const escala = length / 150;
  page.pushOperators(pushGraphicsState(), translateOp(x, y), rotateOp(angleDeg));
  if (mirror) page.pushOperators(scaleOp(-1, 1));
  page.drawSvgPath(RAMA_PATH, {
    x: 0,
    y: 0,
    scale: escala,
    color,
    opacity: 0.42,
    borderWidth: 0,
  });
  // Vena central de cada hoja, solo trazo: es lo que le da el aire de dibujo
  // botánico a pluma, en vez de una simple mancha de color.
  page.drawSvgPath(VENAS_PATH, {
    x: 0,
    y: 0,
    scale: escala,
    borderColor: color,
    borderWidth: 0.6,
    borderOpacity: 0.5,
  });
  page.pushOperators(popGraphicsState());
}

// Confeti de esquina para el estilo "fiesta" — puntos y rectángulos
// esparcidos con una semilla fija para que el resultado sea reproducible.
function drawCornerConfetti(
  page: PDFPage,
  x: number,
  y: number,
  spreadX: number,
  spreadY: number,
  colors: RGB[],
  seed: number,
) {
  const rng = mulberry32(seed);
  for (let i = 0; i < 14; i++) {
    const dx = (rng() - 0.5) * 2 * spreadX;
    const dy = (rng() - 0.5) * 2 * spreadY;
    const color = colors[Math.floor(rng() * colors.length)];
    const opacity = 0.35 + rng() * 0.35;
    if (rng() > 0.5) {
      page.drawEllipse({ x: x + dx, y: y + dy, xScale: 3 + rng() * 3, yScale: 3 + rng() * 3, color, opacity });
    } else {
      page.pushOperators(pushGraphicsState(), translateOp(x + dx, y + dy), rotateOp(rng() * 360));
      page.drawRectangle({ x: -4, y: -2, width: 8, height: 4, color, opacity });
      page.pushOperators(popGraphicsState());
    }
  }
}

// Marca postal (matasellos + línea de ruta punteada), para el estilo
// "Viajes": una línea de puntos que serpentea hacia el matasellos, como el
// trazo de ruta de la plantilla de referencia.
function drawPostalMark(page: PDFPage, x: number, y: number, mirror: boolean, color: RGB) {
  const dir = mirror ? -1 : 1;
  let px = x;
  let py = y;
  for (let i = 0; i < 9; i++) {
    const nx = px + dir * 9;
    const ny = py - (i % 2 === 0 ? 6 : -4);
    page.drawEllipse({ x: nx, y: ny, xScale: 1.4, yScale: 1.4, color, opacity: 0.6 });
    px = nx;
    py = ny;
  }
  page.drawEllipse({
    x: px + dir * 16,
    y: py,
    xScale: 17,
    yScale: 17,
    borderColor: color,
    borderWidth: 1.2,
    borderOpacity: 0.7,
  });
  page.drawEllipse({
    x: px + dir * 16,
    y: py,
    xScale: 12,
    yScale: 12,
    borderColor: color,
    borderWidth: 0.8,
    borderOpacity: 0.5,
  });
}

function drawCornerDecoration(page: PDFPage, x: number, y: number, angleDeg: number, mirror: boolean, palette: Palette, seed: number) {
  if (palette.decoration === "branch" && palette.botanical) {
    const size = 116;
    page.drawImage(palette.botanical, {
      x: mirror ? x + 8 : x - 36,
      y: mirror ? y + size - 10 : y - 26,
      width: size,
      height: size,
      rotate: mirror ? degrees(180) : undefined,
      opacity: 0.82,
    });
  } else if (palette.decoration === "confetti") {
    drawCornerConfetti(page, x, y, 70, 60, palette.tapeColors, seed);
  } else if (palette.decoration === "postal") {
    drawPostalMark(page, x, y, mirror, palette.branch);
  } else {
    drawCornerBranch(page, x, y, angleDeg, 90, mirror, palette.branch);
  }
}

const POLAROID_LAYOUTS: { x: number; y: number; rot: number }[][] = [
  [{ x: 297, y: 195, rot: -4 }],
  [
    { x: 190, y: 195, rot: -7 },
    { x: 400, y: 185, rot: 6 },
  ],
  [
    { x: 150, y: 190, rot: -8 },
    { x: 340, y: 205, rot: 5 },
    { x: 470, y: 170, rot: -5 },
  ],
  [
    { x: 130, y: 200, rot: -8 },
    { x: 320, y: 215, rot: 6 },
    { x: 470, y: 175, rot: -6 },
    { x: 230, y: 150, rot: 9 },
  ],
];

function addCoverPage(
  pdf: PDFDocument,
  album: Album,
  fonts: Fonts,
  stats: { total: number; uploaders: number; days: number },
  previewImages: PDFImage[],
  palette: Palette,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBackground(page, palette);

  if (palette.mandala) {
    // Abanico dorado detrás del título, a juego con la plantilla oscura de
    // referencia ("Mis 15 años"): las ramas quedan semitransparentes bajo
    // el texto en vez de competir con él.
    drawMandalaBurst(page, PAGE_WIDTH / 2, PAGE_HEIGHT - 125, palette.branch);
  } else if (palette.flowerColors) {
    drawFloralBorder(page, 74, palette.flowerColors, 3);
  } else {
    drawCornerDecoration(page, 40, PAGE_HEIGHT - 40, -20, false, palette, 1);
    drawCornerDecoration(page, PAGE_WIDTH - 40, 40, -20, true, palette, 2);
  }

  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 90, fonts.regular, 12, palette.inkFaint);

  let y = drawWrapped(
    page,
    album.name,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 160,
    PAGE_WIDTH - MARGIN * 2,
    38,
    fonts.bold,
    30,
    palette.ink,
    "center",
  );

  y -= 30;
  if (album.eventDate) {
    drawCentered(
      page,
      formatLongDate(new Date(album.eventDate + "T00:00:00")),
      y,
      fonts.italic,
      14,
      palette.inkSoft,
    );
    y -= 26;
  } else if (album.kind === "familia") {
    drawCentered(page, "Álbum de familia", y, fonts.italic, 14, palette.inkSoft);
    y -= 26;
  }

  drawDivider(page, y, palette.accent);
  y -= 30;

  const statsParts = [
    `${stats.total} ${stats.total === 1 ? "recuerdo" : "recuerdos"}`,
    stats.uploaders > 0
      ? `${stats.uploaders} ${stats.uploaders === 1 ? "invitado" : "invitados"}`
      : null,
    stats.days > 1 ? `${stats.days} días` : null,
  ].filter((v): v is string => !!v);
  drawCentered(page, statsParts.join("   ·   "), y, fonts.regular, 13, palette.inkFaint);

  const layout = POLAROID_LAYOUTS[Math.min(previewImages.length, 4) - 1] ?? [];
  previewImages.slice(0, layout.length).forEach((image, i) => {
    drawPolaroid(
      page,
      image,
      layout[i].x,
      layout[i].y,
      layout[i].rot,
      palette.tapeColors[i % palette.tapeColors.length],
    );
  });
}

// Portada con el diseño real (sin personas) incrustado tal cual como imagen
// de fondo a página completa — no una recreación vectorial. Se añade una
// franja inferior con el nombre real del álbum, fecha y estadísticas, ya que
// el diseño en sí trae solo la etiqueta genérica de la categoría (p. ej.
// "Graduation"). La franja usa un tono oscuro del propio color de acento del
// diseño para que el texto blanco siempre se lea bien encima, sea cual sea
// el diseño.
async function addTemplateCoverPage(
  pdf: PDFDocument,
  album: Album,
  fonts: Fonts,
  stats: { total: number; uploaders: number; days: number },
  templateImage: PDFImage,
  cover: TemplateCoverConfig,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  const ink = rgb(0.16, 0.13, 0.1);
  const inkSoft = mix(ink, rgb(1, 1, 1), 0.35);
  const papel = rgb(0.976, 0.961, 0.937);

  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: papel });

  const dateLabel = album.eventDate
    ? formatLongDate(new Date(album.eventDate + "T00:00:00"))
    : album.kind === "familia"
      ? "Álbum de familia"
      : null;

  const statsLine = [
    `${stats.total} ${stats.total === 1 ? "recuerdo" : "recuerdos"}`,
    stats.uploaders > 0
      ? `${stats.uploaders} ${stats.uploaders === 1 ? "invitado" : "invitados"}`
      : null,
    stats.days > 1 ? `${stats.days} días` : null,
  ]
    .filter((v): v is string => !!v)
    .join("   ·   ");

  const nameSize = 22;
  const lineH = 27;
  const nameLines = envolver(album.name, PAGE_WIDTH - MARGIN * 2, fonts.bold, nameSize);

  // Franja de abajo, sobre el papel: el nombre del álbum, la fecha y el
  // recuento. Se mide antes de colocar el diseño, porque es lo que decide
  // cuánto sitio le queda.
  const MARGEN = 30;
  const ARRIBA = 34;
  const banda = 40 + nameLines.length * lineH + (dateLabel ? 20 : 0) + 26;

  // El diseño va entero y sin recortar dentro de lo que sobra.
  //
  // Antes se dibujaba a sangre y el título iba en una placa colocada encima,
  // en el hueco que un análisis de la imagen consideraba más despejado. No
  // funcionaba: ese análisis mide contraste, y en estas portadas no distingue
  // el papel vacío de una acuarela pálida o de un subtítulo fino, que es justo
  // donde acababa poniéndose. Medido sobre las 52 plantillas, una de las más
  // "limpias" según el número (0,013) tapaba el subtítulo de su propio diseño.
  //
  // Montado —el diseño completo arriba, el título debajo sobre el papel— no
  // hay nada que tapar se ponga donde se ponga, y se lee como la cubierta de
  // un libro de fotos en vez de como una pegatina encima del dibujo.
  const cajaAncho = PAGE_WIDTH - MARGEN * 2;
  const cajaAlto = PAGE_HEIGHT - ARRIBA - banda;
  const escala = Math.min(cajaAncho / templateImage.width, cajaAlto / templateImage.height);
  const w = templateImage.width * escala;
  const h = templateImage.height * escala;
  const x = (PAGE_WIDTH - w) / 2;
  const y = PAGE_HEIGHT - ARRIBA - h;

  // Sombra suave y filete del color del diseño: le da el aire de lámina
  // montada y despega el diseño del papel cuando los dos son claros.
  page.drawRectangle({
    x: x + 3,
    y: y - 4,
    width: w,
    height: h,
    color: rgb(0.2, 0.17, 0.12),
    opacity: 0.14,
  });
  page.drawImage(templateImage, { x, y, width: w, height: h });
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: cover.accent,
    borderWidth: 1,
    borderOpacity: 0.55,
  });

  let cursor = y - 30;
  for (const linea of nameLines) {
    const ancho = anchoTrozos(linea, fonts.bold, nameSize);
    dibujarTrozos(page, linea, (PAGE_WIDTH - ancho) / 2, cursor, fonts.bold, nameSize, ink);
    cursor -= lineH;
  }
  cursor += lineH - 24;

  page.drawLine({
    start: { x: PAGE_WIDTH / 2 - 26, y: cursor + 12 },
    end: { x: PAGE_WIDTH / 2 + 26, y: cursor + 12 },
    thickness: 1,
    color: cover.accent,
    opacity: 0.55,
  });

  if (dateLabel) {
    drawCentered(page, dateLabel, cursor - 4, fonts.italic, 12, inkSoft);
    cursor -= 22;
  }
  drawCentered(page, statsLine, cursor - 4, fonts.regular, 10, inkSoft);
}

/**
 * Alto que va a ocupar el pie de la página (autor, fecha y comentarios).
 *
 * Se calcula antes de dibujar nada para poder darle a la foto TODO el hueco
 * que sobra. Antes el marco medía 420 puntos fijos y el pie se colocaba
 * debajo: en una página de 842 eso dejaba media hoja en blanco, y el libro
 * parecía una plantilla a medio rellenar.
 */
function altoDelPie(comments: string[], fonts: Fonts, anchoTexto: number): number {
  let alto = 26 + 22; // separador + línea de autor y fecha
  for (const comment of comments.slice(0, 2)) {
    const lineas = envolver(`"${comment.slice(0, 160)}"`, anchoTexto, fonts.italic, 11);
    alto += lineas.length * 15 + 18;
  }
  return alto;
}

/** Escribe el pie y devuelve dónde se ha quedado. */
function dibujarPie(
  page: PDFPage,
  fonts: Fonts,
  item: MediaItem,
  comments: string[],
  reactionCount: number,
  palette: Palette,
  x: number,
  y: number,
  ancho: number,
) {
  const caption = [
    item.uploaderName ? item.uploaderName : "Anónimo",
    formatLongDate(item.takenAt ?? item.createdAt),
  ]
    .filter(Boolean)
    .join("   ·   ");
  page.drawText(textoParaPdf(caption), { x, y, size: 10.5, font: fonts.regular, color: palette.inkSoft });

  if (reactionCount > 0) {
    const label = `${reactionCount} ${reactionCount === 1 ? "reacción" : "reacciones"}`;
    const w = fonts.regular.widthOfTextAtSize(label, 9.5);
    page.drawText(label, { x: x + ancho - w, y, size: 9.5, font: fonts.regular, color: palette.accent });
  }

  let cursor = y - 20;
  for (const comment of comments.slice(0, 2)) {
    cursor = drawWrapped(
      page,
      `"${comment.slice(0, 160)}"`,
      x,
      cursor,
      ancho,
      15,
      fonts.italic,
      11,
      palette.inkFaint,
    );
    cursor -= 18;
  }
  return cursor;
}

/**
 * Página de varias fotos: dos apiladas, dos lado a lado, o una grande con dos
 * pequeñas debajo. Es lo que le da ritmo al libro; con una foto por hoja
 * doscientas veces seguidas parecía un listado.
 *
 * Debajo de cada foto va quién la subió y, si dejó uno corto, su comentario
 * de pie de foto. Solo lo que trae varios comentarios o uno largo se lleva
 * página entera: obligar a página entera con cualquier comentario devolvía el
 * libro a una foto por hoja en cuanto la gente comentaba de verdad.
 */
async function addMosaicPage(
  pdf: PDFDocument,
  fonts: Fonts,
  tipo: "dos" | "tres",
  fotos: { item: MediaItem; image: PDFImage; comentario?: string }[],
  palette: Palette,
  etiqueta: string,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBackground(page, palette);
  drawCornerDecoration(page, 34, PAGE_HEIGHT - 34, -20, false, palette, fotos.length * 7 + 3);
  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 44, fonts.regular, 9, palette.inkFaint);

  const izq = MARGIN - 6;
  const anchoTotal = PAGE_WIDTH - izq * 2;
  const arriba = PAGE_HEIGHT - 96;
  const abajo = 64;
  const hueco = 16;          // aire entre fotos

  // Alto que hay que reservar debajo de cada foto: una línea para el "subido
  // por", dos si además lleva comentario.
  // Un comentario que solo eran emoji sin icono se queda en nada al prepararlo
  // para el PDF; entonces no hay leyenda que poner y basta con una línea.
  const pieDe = (f: { comentario?: string }) =>
    f.comentario && trocearTexto(f.comentario).length > 0 ? 27 : 15;

  type Celda = { item: MediaItem; image: PDFImage; comentario?: string };
  const pad = 10;

  /**
   * Lo que ocupa de verdad una foto dentro de un hueco.
   *
   * Casi nunca llena el hueco entero: el marco se ajusta a la proporción de la
   * imagen, así que una vertical en un hueco ancho deja aire a los lados y una
   * apaisada en uno alto lo deja arriba y abajo. Saberlo por adelantado es lo
   * que permite elegir la colocación que mejor aprovecha la hoja en vez de
   * adivinarla por la forma.
   */
  const medir = (f: Celda, cw: number, ch: number, pie = pieDe(f)) => {
    const disponibleH = ch - pie;
    const prop = f.image.width / f.image.height;
    let h = Math.min(disponibleH, (cw - pad * 2) / prop + pad * 2);
    let w = Math.min(cw, (h - pad * 2) * prop + pad * 2);
    if (!Number.isFinite(w) || w <= 0) {
      w = cw;
      h = disponibleH;
    }
    return { w, h, alto: h + pie, area: w * h };
  };

  /**
   * Dibuja una foto encajada en su hueco, con su marco ajustado y su pie.
   *
   * Dos fotos que van una al lado de la otra se apoyan en el mismo suelo y
   * reservan el mismo pie (`fila`): centrada cada una en su columna, la que
   * era más baja dejaba su leyenda a media altura de la otra y la pareja se
   * veía descuadrada.
   */
  const celda = (
    f: Celda,
    cx: number,
    cy: number,
    cw: number,
    ch: number,
    fila?: { pie: number },
  ) => {
    const pieFoto = fila?.pie ?? pieDe(f);
    const { w, h } = medir(f, cw, ch, pieFoto);
    const x = cx + (cw - w) / 2;
    const y = fila ? cy + pieFoto : cy + pieFoto + (ch - pieFoto - h) / 2;

    drawFrame(page, x, y, w, h, palette.accent);
    const iw = w - pad * 2;
    const ih = h - pad * 2;
    const escala = Math.min(iw / f.image.width, ih / f.image.height);
    page.drawImage(f.image, {
      x: x + (w - f.image.width * escala) / 2,
      y: y + (h - f.image.height * escala) / 2,
      width: f.image.width * escala,
      height: f.image.height * escala,
    });

    const quien = f.item.uploaderName ?? "Anónimo";
    const trozos = f.comentario ? trocearTexto(`«${f.comentario}»`) : [];
    if (trozos.length > 0) {
      // El comentario primero, en cursiva y en tinta normal: es lo que se lee.
      // Se recorta a una línea del ancho de la foto para no invadir la celda
      // de al lado ni comerse el aire de la de abajo.
      const lineas = partirTrozos(trozos, w, fonts.italic, 9);
      const linea: Trozo[] =
        lineas.length > 1 ? [...lineas[0], { tipo: "texto", texto: "...»" }] : lineas[0];
      const anchoLinea = anchoTrozos(linea, fonts.italic, 9);
      dibujarTrozos(page, linea, x + (w - anchoLinea) / 2, y - 11, fonts.italic, 9, palette.ink);
      drawCentered(page, quien, y - 22, fonts.regular, 8, palette.inkFaint, x + w / 2);
    } else {
      drawCentered(page, quien, y - 12, fonts.regular, 8.5, palette.inkFaint, x + w / 2);
    }
  };

  const alto = arriba - abajo;

  if (tipo === "dos") {
    // Dos verticales van una junto a otra; en cuanto hay una apaisada de por
    // medio, apiladas. Apilar dos verticales las deja altas pero estrechas,
    // con una franja en blanco a cada lado de la hoja; y poner dos apaisadas
    // en columnas las encoge a la mitad sin ganar nada de alto. Se mira la
    // proporción real de cada imagen y no la forma redondeada, porque una
    // "cuadrada" de 1,05 y una de 0,95 se colocan distinto.
    const ambasVerticales = fotos.every((f) => f.image.height > f.image.width);

    if (ambasVerticales) {
      // En columnas, dos verticales solo pueden ser tan anchas como media
      // hoja, y a lo alto se quedan en la mitad: alineadas dejaban una franja
      // vacía arriba y otra abajo del mismo tamaño que las fotos. Escalonadas
      // —una arriba a la izquierda, otra abajo a la derecha— ocupan la hoja
      // entera sin encogerlas ni recortarlas.
      const cwLado = (anchoTotal - hueco) / 2;
      const lado = fotos.map((f) => medir(f, cwLado, alto));
      const masAlta = Math.max(lado[0].alto, lado[1].alto);
      const desplazamiento = Math.min(alto - masAlta, masAlta * 0.55);
      const usado = masAlta + desplazamiento;
      const base = abajo + (alto - usado) / 2;
      celda(fotos[0], izq, base + desplazamiento, cwLado, lado[0].alto);
      celda(fotos[1], izq + cwLado + hueco, base, cwLado, lado[1].alto);
    } else {
      // Apiladas, las alturas se reparten según la forma de cada foto y no a
      // mitades: con celdas iguales, una vertical junto a una apaisada salía
      // diminuta porque no podía usar el ancho que le sobraba a la otra.
      const disponible = alto - hueco;
      const pide = fotos.map(
        (f) => (anchoTotal - pad * 2) / (f.image.width / f.image.height) + pad * 2 + pieDe(f),
      );
      const h0 = (disponible * pide[0]) / (pide[0] + pide[1]);
      const reparto = [h0, disponible - h0];
      const api = fotos.map((f, i) => medir(f, anchoTotal, reparto[i]));
      const usado = api[0].alto + api[1].alto + hueco;
      const base = abajo + (alto - usado) / 2;
      celda(fotos[0], izq, base + api[1].alto + hueco, anchoTotal, api[0].alto);
      celda(fotos[1], izq, base, anchoTotal, api[1].alto);
    }
  } else {
    // Una grande arriba y dos pequeñas debajo: la proporción clásica de
    // álbum, que evita que las tres salgan del mismo tamaño y aburran.
    const chGrande = (arriba - abajo - hueco) * 0.58;
    const chPeque = arriba - abajo - hueco - chGrande;
    const cwPeque = (anchoTotal - hueco) / 2;
    const pieFila = Math.max(pieDe(fotos[1]), pieDe(fotos[2]));
    celda(fotos[0], izq, abajo + chPeque + hueco, anchoTotal, chGrande);
    celda(fotos[1], izq, abajo, cwPeque, chPeque, { pie: pieFila });
    celda(fotos[2], izq + cwPeque + hueco, abajo, cwPeque, chPeque, { pie: pieFila });
  }

  drawCentered(page, etiqueta, 32, fonts.regular, 9, palette.inkFaint);
}

async function addPhotoPage(
  pdf: PDFDocument,
  fonts: Fonts,
  item: MediaItem,
  comments: string[],
  reactionCount: number,
  palette: Palette,
  index: number,
  total: number,
  cache: Map<string, Descarga>,
  /** Lo decide el repartidor de páginas, que es quien conoce el ritmo. */
  aSangre = false,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);

  // Margen lateral propio de la foto, más estrecho que el del texto: una foto
  // apaisada solo puede crecer a lo ancho, y cada punto que se le quita al
  // margen se convierte en foto más grande.
  const frameX = MARGIN - 6;
  const frameW = PAGE_WIDTH - (MARGIN - 6) * 2;

  // De los vídeos se imprime su fotograma de portada (los grabados antes de
  // que existiera no lo tienen y caen en el QR de siempre).
  const printable = item.type === "image" ? item.url : item.posterUrl;
  const image = printable ? await tryEmbedImage(pdf, printable, cache.get(printable)) : null;

  // ---- Página a sangre: la foto es la página -------------------------------
  if (image && item.type === "image" && aSangre) {
    drawImageCover(page, image, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);

    // Franja de papel abajo para que el pie se lea sobre cualquier foto, por
    // oscura o clara que sea. Sin ella el texto desaparecía en las fotos
    // nocturnas y se comía la cara en las claras.
    const franja = 78;
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: franja,
      color: palette.bg,
      opacity: 0.93,
    });
    page.drawRectangle({ x: 0, y: franja, width: PAGE_WIDTH, height: 1.2, color: palette.accent, opacity: 0.55 });

    dibujarPie(page, fonts, item, comments, reactionCount, palette, MARGIN, franja - 30, PAGE_WIDTH - MARGIN * 2);
    drawCentered(page, `${index} / ${total}`, 16, fonts.regular, 9, palette.inkFaint);
    return;
  }

  // ---- Página con marco: la foto se estira hasta donde empieza el pie ------
  drawBackground(page, palette);
  drawCornerDecoration(page, 30, PAGE_HEIGHT - 30, -20, false, palette, index * 2 + 11);
  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 38, fonts.regular, 8, palette.inkFaint);
  page.drawRectangle({
    x: 22,
    y: 48,
    width: PAGE_WIDTH - 44,
    height: PAGE_HEIGHT - 112,
    color: palette.accent,
    opacity: 0.025,
  });
  const arribaDelArea = PAGE_HEIGHT - 76;
  const abajoDelArea = 54; // hueco para el número de página
  const hayAvisoDeVideo = item.type === "video" && !!image;
  const pie = altoDelPie(comments, fonts, frameW) + (hayAvisoDeVideo ? 12 : 0);
  const altoDisponible = arribaDelArea - abajoDelArea - pie - 22;

  // El marco se ajusta a la foto en vez de ser una caja fija. Con una caja
  // fija y alta, una foto apaisada dejaba dos bandas blancas enormes arriba y
  // abajo dentro del propio marco, que es lo que hacía que la página pareciera
  // a medio montar.
  const pad = 12;
  const proporcion = image ? image.width / image.height : 1.2;
  let frameH = Math.min(altoDisponible, (frameW - pad * 2) / proporcion + pad * 2);
  let frameWReal = Math.min(frameW, (frameH - pad * 2) * proporcion + pad * 2);
  if (!image) {
    // La página de respaldo con QR necesita sitio para el código y su leyenda.
    frameH = Math.min(altoDisponible, 300);
    frameWReal = frameW;
  }

  // El bloque entero (foto + pie) se centra en el hueco libre, para que los
  // márgenes de arriba y de abajo queden parejos.
  const altoBloque = frameH + 22 + pie;
  // Ligeramente por debajo del centro geométrico: arriba ya hay encabezado y
  // adorno ocupando sitio, así que repartir el sobrante a partes iguales dejaba
  // la página con pinta de vacía por abajo.
  const sobra = arribaDelArea - abajoDelArea - altoBloque;
  const frameY = abajoDelArea + sobra * 0.58 + 22 + pie;
  const frameXReal = (PAGE_WIDTH - frameWReal) / 2;

  let embedded = false;
  if (image) {
    drawFrame(page, frameXReal, frameY, frameWReal, frameH, palette.accent);
    // "Contain" (no recorte) para la foto protagonista: se ve completa
    // siempre, sea cual sea su proporción original.
    const innerW = frameWReal - pad * 2;
    const innerH = frameH - pad * 2;
    const scale = Math.min(innerW / image.width, innerH / image.height);
    const w = image.width * scale;
    const h = image.height * scale;
    page.drawImage(image, {
      x: frameXReal + (frameWReal - w) / 2,
      y: frameY + (frameH - h) / 2,
      width: w,
      height: h,
    });
    embedded = true;

    // Un vídeo impreso es una foto quieta: se le pone un QR pequeño en la
    // esquina para poder verlo de verdad desde el papel.
    if (item.type === "video") {
      const qrImage = await embedQr(pdf, item.url, 240);
      const qrSize = 62;
      const qx = frameXReal + frameWReal - pad - qrSize;
      const qy = frameY + pad;
      page.drawRectangle({
        x: qx - 5,
        y: qy - 5,
        width: qrSize + 10,
        height: qrSize + 10,
        color: rgb(1, 1, 1),
        opacity: 0.92,
      });
      page.drawImage(qrImage, { x: qx, y: qy, width: qrSize, height: qrSize });
      // Justo debajo del marco, no encima del borde: ahí se cortaba.
      drawCentered(page, "Escanea el QR para ver el vídeo", frameY - 12, fonts.regular, 9, palette.inkFaint);
    }
  }

  if (!embedded) {
    drawFrame(page, frameXReal, frameY, frameWReal, frameH, palette.accent);
    page.drawRectangle({
      x: frameXReal + 18,
      y: frameY + 18,
      width: frameWReal - 36,
      height: frameH - 36,
      color: SAND,
    });
    const qrImage = await embedQr(pdf, item.url, 400);
    const qrSize = 200;
    page.drawImage(qrImage, {
      x: frameXReal + (frameWReal - qrSize) / 2,
      y: frameY + (frameH - qrSize) / 2 + 20,
      width: qrSize,
      height: qrSize,
    });
    drawCentered(
      page,
      item.type === "video" ? "Escanea para ver el vídeo" : "Escanea para ver la foto original",
      frameY + (frameH - qrSize) / 2 - 14,
      fonts.regular,
      12,
      palette.inkSoft,
    );
  }

  // En los vídeos hay una línea extra bajo el marco («escanea el QR»), así que
  // el pie baja un poco para no montarse encima.
  let y = frameY - (hayAvisoDeVideo ? 31 : 18);
  page.drawLine({
    start: { x: frameXReal, y },
    end: { x: frameXReal + Math.min(frameWReal, 74), y },
    thickness: 1.2,
    color: palette.accent,
    opacity: 0.75,
  });
  y -= 22;

  dibujarPie(page, fonts, item, comments, reactionCount, palette, frameX, y, frameW);
  drawCentered(page, `${index}  /  ${total}`, 26, fonts.regular, 8, palette.inkFaint);
}

// Páginas de dedicatorias: los mensajes del muro impresos como notas, con la
// firma de quien los escribió. Es la parte "de puño y letra" del libro, la que
// no sale de ninguna foto.
function addMessagePages(
  pdf: PDFDocument,
  fonts: Fonts,
  messages: DotbookMessage[],
  palette: Palette,
) {
  const cardW = PAGE_WIDTH - MARGIN * 2;
  const textW = cardW - 44;
  const lineHeight = 16;
  const bodySize = 11.5;
  const bottomLimit = MARGIN + 30;

  let page: PDFPage | null = null;
  let y = 0;

  function startPage(first: boolean) {
    page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    drawBackground(page, palette);
    drawCornerDecoration(page, 34, PAGE_HEIGHT - 34, -20, false, palette, first ? 41 : 43);
    y = PAGE_HEIGHT - MARGIN - 30;
    drawCentered(
      page,
      first ? "Dedicatorias" : "Dedicatorias (continuación)",
      y,
      fonts.bold,
      first ? 28 : 16,
      palette.ink,
    );
    y -= first ? 20 : 16;
    drawDivider(page, y, palette.accent);
    y -= 34;
  }

  startPage(true);

  for (const message of messages) {
    const lines = envolver(message.body.slice(0, 900), textW, fonts.italic, bodySize);
    const cardH = Math.max(92, lines.length * lineHeight + 62);

    if (y - cardH < bottomLimit) startPage(false);
    const p = page!;

    // Nota: papel claro con una pestaña de color al costado.
    p.drawRectangle({
      x: MARGIN + 3,
      y: y - cardH - 5,
      width: cardW,
      height: cardH,
      color: rgb(0.2, 0.17, 0.12),
      opacity: 0.08,
    });
    p.drawRectangle({
      x: MARGIN,
      y: y - cardH,
      width: cardW,
      height: cardH,
      color: mix(rgb(1, 1, 1), palette.bg, 0.12),
      borderColor: palette.accent,
      borderWidth: 0.55,
      borderOpacity: 0.55,
    });
    p.drawRectangle({
      x: MARGIN,
      y: y - cardH,
      width: 3,
      height: cardH,
      color: palette.accent,
      opacity: 0.9,
    });

    // Comilla de apertura, a modo de adorno.
    p.drawText("“", {
      x: MARGIN + 16,
      y: y - 33,
      size: 40,
      font: fonts.bold,
      color: palette.accent,
      opacity: 0.22,
    });

    lines.forEach((line, i) => {
      dibujarTrozos(p, line, MARGIN + 34, y - 30 - i * lineHeight, fonts.italic, bodySize, palette.ink);
    });

    const signature = textoParaPdf(
      `— ${message.authorName?.trim() || "Anónimo"} · ${formatLongDate(message.createdAt)}`,
    );
    const sigWidth = fonts.regular.widthOfTextAtSize(signature, 9.5);
    p.drawText(signature, {
      x: MARGIN + cardW - 18 - sigWidth,
      y: y - cardH + 16,
      size: 9.5,
      font: fonts.regular,
      color: palette.inkFaint,
    });

    y -= cardH + 22;
  }
}

function addClosingPage(
  pdf: PDFDocument,
  fonts: Fonts,
  qrImage: PDFImage,
  palette: Palette,
  seleccion: { impresos: number; totales: number } | null,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: palette.bgClosing });
  drawCornerDecoration(page, 42, PAGE_HEIGHT - 42, -18, false, palette, 71);
  drawCornerDecoration(page, PAGE_WIDTH - 42, 42, -18, true, palette, 73);
  const centerY = PAGE_HEIGHT / 2 + 60;

  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 78, fonts.regular, 9, palette.inkFaint);
  drawCentered(page, "Gracias por compartir", centerY + 48, fonts.bold, 27, palette.ink);
  drawCentered(page, "estos recuerdos", centerY + 14, fonts.bold, 27, palette.ink);
  drawDivider(page, centerY - 14, palette.accent);
  drawCentered(page, "Cada fotografía guarda un instante;", centerY - 48, fonts.italic, 11, palette.inkSoft);
  drawCentered(page, "juntas cuentan vuestra historia.", centerY - 65, fonts.italic, 11, palette.inkSoft);

  // Si el álbum no cabía entero, se dice claramente en vez de dejar al
  // organizador contando páginas para ver qué falta.
  if (seleccion) {
    drawCentered(
      page,
      `En este libro hay ${seleccion.impresos} de los ${seleccion.totales} recuerdos del álbum,`,
      centerY - 46,
      fonts.regular,
      11,
      palette.inkSoft,
    );
    drawCentered(
      page,
      "elegidos de principio a fin del evento. Los tienes todos en el álbum.",
      centerY - 62,
      fonts.regular,
      11,
      palette.inkSoft,
    );
  }

  const qrSize = 132;
  const qrX = (PAGE_WIDTH - qrSize) / 2;
  const qrY = centerY - 232;
  page.drawRectangle({
    x: qrX - 14,
    y: qrY - 14,
    width: qrSize + 28,
    height: qrSize + 28,
    color: rgb(1, 1, 1),
    opacity: 0.92,
    borderColor: palette.accent,
    borderWidth: 0.65,
    borderOpacity: 0.45,
  });
  page.drawImage(qrImage, {
    x: qrX,
    y: qrY,
    width: qrSize,
    height: qrSize,
  });
  drawCentered(page, "Escanea para volver al álbum", qrY - 32, fonts.regular, 10, palette.inkSoft);
}

// Genera el "Dotbook digital": una portada tipo scrapbook con fotos reales
// a modo de polaroid, y una página por recuerdo con marco, comentarios y
// reacciones. Los vídeos (y las fotos en formatos que un PDF no puede
// incrustar, como HEIC) se representan con un código QR que lleva
// directamente al recuerdo original — igual que hace Dots Memories en su
// libro físico.
export async function buildDotbookPdf(
  album: Album,
  items: MediaItem[],
  extras: DotbookExtras,
  style: DotbookStyle = "clasico",
): Promise<Uint8Array> {
  let palette = isTemplateStyle(style)
    ? paletteFromAccent(TEMPLATE_COVERS[style].accent)
    : (PALETTES[style] ?? PALETTES.clasico);
  const pdf = await PDFDocument.create();
  if (palette.decoration === "branch") {
    try {
      const { readFile } = await import("node:fs/promises");
      const { join } = await import("node:path");
      const bytes = await readFile(join(process.cwd(), "public", "dotbook-assets", "botanical-branch.png"));
      palette = { ...palette, botanical: await pdf.embedPng(bytes) };
    } catch {
      // La rama vectorial sigue siendo un respaldo seguro en entornos sin el recurso.
    }
  }
  pdf.setTitle(`Dotbook · ${album.name}`);
  const fonts: Fonts = {
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
  };

  const todos = [...items].sort((a, b) => {
    const da = (a.takenAt ?? a.createdAt).getTime();
    const db_ = (b.takenAt ?? b.createdAt).getTime();
    return da - db_;
  });

  // Un libro es un libro: con 900 recuerdos el PDF no lo abre nadie y el
  // servidor se queda sin tiempo antes de terminarlo. Se imprime una
  // selección repartida por todo el evento (no los 200 primeros, que serían
  // todos del aperitivo) y se avisa en la última página.
  const recortado = todos.length > MAX_DOTBOOK_PAGES;
  const sorted = recortado ? pickSpread(todos, MAX_DOTBOOK_PAGES) : todos;

  // Las cifras de la portada son las del álbum entero, aunque el libro
  // imprima una selección.
  const uploaders = new Set(
    todos.map((i) => i.uploaderName).filter((n): n is string => !!n && n.trim().length > 0),
  );
  const days = new Set(todos.map((i) => dayKey(i.takenAt ?? i.createdAt)));

  const stats = { total: todos.length, uploaders: uploaders.size, days: days.size };

  // Todas las descargas de golpe, en paralelo, antes de dibujar nada: es la
  // diferencia entre esperar 200 veces seguidas y esperar 25.
  const portadasNecesarias = todos
    .filter((i) => i.type === "image")
    .slice(0, 4)
    .map((i) => i.url);
  const cache = await descargarTodas([
    ...sorted.map((i) => (i.type === "image" ? i.url : i.posterUrl)),
    ...portadasNecesarias,
  ].filter((u): u is string => !!u));

  let templateCoverImage: PDFImage | null = null;
  if (isTemplateStyle(style)) {
    const templateBytes = await leerPlantilla(TEMPLATE_COVERS[style].file);
    if (templateBytes) {
      try {
        templateCoverImage = await pdf.embedJpg(templateBytes);
      } catch (err) {
        console.error("No se pudo incrustar la portada de plantilla:", err);
      }
    }
  }

  if (templateCoverImage && isTemplateStyle(style)) {
    await addTemplateCoverPage(
      pdf,
      album,
      fonts,
      stats,
      templateCoverImage,
      TEMPLATE_COVERS[style],
    );
  } else {
    const previewImages: PDFImage[] = [];
    for (const url of portadasNecesarias) {
      const img = await tryEmbedImage(pdf, url, cache.get(url));
      if (img) previewImages.push(img);
    }
    addCoverPage(pdf, album, fonts, stats, previewImages, palette);
  }

  // Se incrustan primero las imágenes para saber la forma de cada una: el
  // reparto en páginas depende de si son verticales o apaisadas, y eso no se
  // sabe hasta tenerlas. `tryEmbedImage` reutiliza lo ya descargado.
  const incrustadas = new Map<string, PDFImage>();
  for (const item of sorted) {
    const url = item.type === "image" ? item.url : item.posterUrl;
    if (!url) continue;
    const img = await tryEmbedImage(pdf, url, cache.get(url));
    if (img) incrustadas.set(item.id, img);
  }

  const candidatas: CandidataMosaico[] = sorted.map((item, i) => {
    const img = incrustadas.get(item.id);
    const comentarios = extras.commentsByMedia.get(item.id) ?? [];
    return {
      indice: i,
      forma: img ? formaDe(img.width, img.height) : "vertical",
      // Va sola si es un vídeo (lleva su QR y su leyenda), si no se pudo
      // incrustar (QR grande) o si trae texto que no cabe de pie de foto.
      sola:
        !img ||
        item.type === "video" ||
        (comentarios.length > 0 && !cabeDePie(comentarios)),
    };
  });

  for (const pagina of repartirEnPaginas(candidatas)) {
    const numeros = pagina.indices.map((i) => i + 1);
    const etiqueta =
      numeros.length === 1
        ? `${numeros[0]} / ${sorted.length}`
        : `${numeros[0]}–${numeros[numeros.length - 1]} / ${sorted.length}`;

    if (pagina.tipo === "una" || pagina.tipo === "sangre") {
      const item = sorted[pagina.indices[0]];
      await addPhotoPage(
        pdf,
        fonts,
        item,
        extras.commentsByMedia.get(item.id) ?? [],
        extras.reactionCountByMedia.get(item.id) ?? 0,
        palette,
        numeros[0],
        sorted.length,
        cache,
        pagina.tipo === "sangre",
      );
      continue;
    }

    await addMosaicPage(
      pdf,
      fonts,
      pagina.tipo,
      pagina.indices.map((i) => {
        const item = sorted[i];
        const comentarios = extras.commentsByMedia.get(item.id) ?? [];
        return {
          item,
          image: incrustadas.get(item.id)!,
          comentario: cabeDePie(comentarios) ? comentarios[0].trim() : undefined,
        };
      }),
      palette,
      etiqueta,
    );
  }

  if (extras.messages.length > 0) {
    addMessagePages(pdf, fonts, extras.messages, palette);
  }

  const closingQr = await embedQr(pdf, extras.shareUrl, 300);
  addClosingPage(
    pdf,
    fonts,
    closingQr,
    palette,
    recortado ? { impresos: sorted.length, totales: todos.length } : null,
  );

  return pdf.save();
}
