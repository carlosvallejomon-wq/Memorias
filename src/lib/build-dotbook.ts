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

function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

// pdf-lib no sabe dibujar rectángulos con esquinas redondeadas: se componen
// con dos rectángulos cruzados y cuatro círculos en las esquinas.
function drawRoundedBox(
  page: PDFPage,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  color: RGB,
  opacity: number,
) {
  page.drawRectangle({ x: x + r, y, width: w - r * 2, height: h, color, opacity });
  page.drawRectangle({ x, y: y + r, width: w, height: h - r * 2, color, opacity });
  for (const [cx, cy] of [
    [x + r, y + r],
    [x + w - r, y + r],
    [x + r, y + h - r],
    [x + w - r, y + h - r],
  ]) {
    page.drawEllipse({ x: cx, y: cy, xScale: r, yScale: r, color, opacity });
  }
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
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: centerX - width / 2, y, size, font, color });
}

// Parte un texto en líneas que caben en `maxWidth`, respetando los saltos de
// línea que el autor haya escrito a mano.
function wrapLines(
  text: string,
  maxWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split(/\r?\n/)) {
    let line = "";
    for (const word of paragraph.split(" ")) {
      const test = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  return lines;
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
  const lines = wrapLines(text, maxWidth, font, size);
  lines.forEach((l, i) => {
    const lx = align === "center" ? x - font.widthOfTextAtSize(l, size) / 2 : x;
    page.drawText(l, { x: lx, y: y - i * lineHeight, size, font, color });
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
  page.drawRectangle({ x: x + 5, y: y - 5, width: w, height: h, color: rgb(0.2, 0.17, 0.12), opacity: 0.18 });
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor,
    borderWidth: 1.5,
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
type Hueco = { x: number; y: number; suciedad: number };

/**
 * A partir de aquí el mejor hueco ya no está limpio: hay dibujo o texto del
 * propio diseño donde iría la placa. Cuando pasa, se vuelve a buscar con la
 * placa pequeña antes de resignarse a taparlo.
 */
const HUECO_LIMPIO = 45;

/**
 * Y a partir de aquí no hay hueco en toda la portada: el diseño va ilustrado
 * de esquina a esquina y la placa va a tapar algo se ponga donde se ponga.
 * Entonces se deja de buscar y se pone abajo del todo, como el pie de una
 * foto — que es donde menos raro queda y donde nunca se come el título.
 */
const PORTADA_LLENA = 120;

/**
 * Busca en la portada el hueco más despejado donde quepa la placa del título.
 *
 * Antes esta posición era un número escrito a mano por cada plantilla, y cada
 * vez que se afinaba una se estropeaba otra: la placa acababa encima del
 * dibujo o del texto del propio diseño. Aquí se mira la imagen de verdad —
 * cuánto "detalle" hay en cada franja— y se elige la que menos tiene, del
 * tamaño exacto que va a ocupar la placa. Así también funciona con las
 * plantillas que se añadan más adelante, sin tocar código.
 *
 * Devuelve la esquina inferior izquierda de la placa (en puntos de PDF, con el
 * 0 abajo) y lo sucio que ha quedado el mejor hueco, o null si no se pudo
 * analizar — entonces se usa el valor de respaldo de siempre.
 */
async function huecoParaLaPlaca(
  bytes: Uint8Array,
  anchoPlaca: number,
  altoPlaca: number,
): Promise<Hueco | null> {
  try {
    const sharp = (await import("sharp")).default;

    // Se analiza en pequeño (rápido y sin ruido de detalle fino) y con la
    // misma proporción y recorte que tendrá en la página.
    const ANCHO = 120;
    const ALTO = Math.round((ANCHO * PAGE_HEIGHT) / PAGE_WIDTH);
    const { data } = await sharp(bytes)
      .rotate()
      .resize(ANCHO, ALTO, { fit: "cover", position: "centre" })
      .greyscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Color del papel: la mediana del borde exterior, que en estos diseños es
    // casi siempre fondo limpio.
    const borde: number[] = [];
    for (let x = 0; x < ANCHO; x++) {
      borde.push(data[x], data[(ALTO - 1) * ANCHO + x]);
    }
    for (let y = 0; y < ALTO; y++) {
      borde.push(data[y * ANCHO], data[y * ANCHO + ANCHO - 1]);
    }
    borde.sort((a, b) => a - b);
    const fondo = borde[Math.floor(borde.length / 2)];

    // "Detalle" = cuánto cambia cada píxel respecto a sus vecinos, MÁS cuánto
    // se aleja del color del papel. Solo con lo primero, un título grande de
    // color suave (el "15 Years" rosa sobre crema) apenas puntuaba y la placa
    // se plantaba encima; lo segundo lo detecta aunque tenga poco contraste.
    const detalle = new Float64Array(ANCHO * ALTO);
    for (let y = 1; y < ALTO - 1; y++) {
      for (let x = 1; x < ANCHO - 1; x++) {
        const i = y * ANCHO + x;
        const dx = Math.abs(data[i - 1] - data[i + 1]);
        const dy = Math.abs(data[i - ANCHO] - data[i + ANCHO]);
        const lejosDelPapel = Math.abs(data[i] - fondo);
        detalle[i] = dx + dy + lejosDelPapel * 0.8;
      }
    }

    // Tamaño de la placa en la rejilla de análisis, con algo de aire alrededor
    // para que no quede pegada a lo que tenga al lado.
    const anchoCaja = Math.min(ANCHO, Math.round(((anchoPlaca + 24) / PAGE_WIDTH) * ANCHO));
    const altoCaja = Math.max(1, Math.round(((altoPlaca + 16) / PAGE_HEIGHT) * ALTO));
    const margenY = Math.round((26 / PAGE_HEIGHT) * ALTO);
    const margenX = Math.round((MARGIN / PAGE_WIDTH) * ANCHO);

    // Se prueba la placa en varias posiciones, moviéndola también a izquierda
    // y derecha. Con los diseños más cargados —una quinceañera dibujada justo
    // en el centro— quedarse siempre centrada obligaba a taparle la cara o el
    // vestido; dejándola correrse a un lado cabe en el hueco de al lado.
    const izquierdaMax = ANCHO - margenX - anchoCaja;
    const posicionesX: number[] = [];
    for (let k = 0; k <= 8; k++) {
      const x = Math.round(margenX + ((izquierdaMax - margenX) * k) / 8);
      if (x >= 0 && x + anchoCaja <= ANCHO) posicionesX.push(x);
    }
    if (posicionesX.length === 0) posicionesX.push(Math.max(0, Math.round((ANCHO - anchoCaja) / 2)));

    const centroX = (ANCHO - anchoCaja) / 2;
    let mejorX = -1;
    let mejorY = -1;
    let mejorCoste = Infinity;
    let mejorSuciedad = Infinity;

    for (const x0 of posicionesX) {
      const x1 = Math.min(ANCHO, x0 + anchoCaja);

      // De cada fila se guarda su punto MÁS marcado dentro de estas columnas,
      // no la media: un subtítulo fino ("PHOTO ALBUM COVER FOR BAPTISM") son
      // cuatro píxeles oscuros que, promediados a lo ancho de la placa, salían
      // casi gratis — y la placa acababa comiéndose la primera palabra.
      const maxPorFila = new Float64Array(ALTO);
      for (let y = 0; y < ALTO; y++) {
        let m = 0;
        for (let x = x0; x < x1; x++) {
          const v = detalle[y * ANCHO + x];
          if (v > m) m = v;
        }
        maxPorFila[y] = m;
      }

      for (let top = margenY; top + altoCaja <= ALTO - margenY; top++) {
        // Lo más marcado que hay en toda la caja: si dentro cae cualquier
        // texto o dibujo, esa posición queda descartada frente a una limpia.
        let peor = 0;
        for (let y = top; y < top + altoCaja; y++) {
          if (maxPorFila[y] > peor) peor = maxPorFila[y];
        }
        // A igualdad de limpieza se prefiere abajo (donde un pie de portada se
        // ve natural) y centrada (que es lo más formal): solo se descentra si
        // de verdad compensa.
        const centroVertical = (top + altoCaja / 2) / ALTO;
        const desvio = Math.abs(x0 - centroX) / ANCHO;
        const total = peor + (1 - centroVertical) * 12 + desvio * 45;
        if (total < mejorCoste) {
          mejorCoste = total;
          mejorSuciedad = peor;
          mejorX = x0;
          mejorY = top;
        }
      }
    }
    if (mejorY < 0 || mejorX < 0) return null;

    // De coordenadas de imagen (0 arriba) a coordenadas de PDF (0 abajo).
    const centroDesdeArriba = (mejorY + altoCaja / 2) / ALTO;
    return {
      x: ((mejorX + anchoCaja / 2) / ANCHO) * PAGE_WIDTH - anchoPlaca / 2,
      y: PAGE_HEIGHT * (1 - centroDesdeArriba) - altoPlaca / 2,
      suciedad: mejorSuciedad,
    };
  } catch (err) {
    console.error("No se pudo analizar la portada para colocar el título:", err);
    return null;
  }
}

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
  if (palette.decoration === "confetti") {
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
  /** Bytes del diseño, para analizar dónde queda hueco libre. */
  templateBytes: Uint8Array | null,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawImageCover(page, templateImage, 0, 0, PAGE_WIDTH, PAGE_HEIGHT);

  // El texto va en una placa clara del tamaño justo, colocada en la franja más
  // despejada del diseño. Antes era una banda maciza de lado a lado que tapaba
  // media portada.
  const ink = rgb(0.16, 0.13, 0.1);
  const inkSoft = mix(ink, rgb(1, 1, 1), 0.35);

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

  // En los diseños con el hueco libre muy justo, la placa se hace algo más
  // pequeña (menos relleno, letra algo menor) para que quepa sin montarse
  // sobre el propio texto del diseño.
  const medidas = (compacta: boolean) => {
    const nameSize = compacta ? 18 : 22;
    const padX = compacta ? 24 : 30;
    const padY = compacta ? 15 : 22;
    const lineH = compacta ? 22 : 27;
    const dateGap = compacta ? 14 : 20;
    const footerGap = compacta ? 12 : 16;
    const dateSize = compacta ? 11 : 12;
    const statsSize = compacta ? 9 : 10;

    const maxTextW = PAGE_WIDTH - MARGIN * 2 - 60;
    const nameLines = wrapLines(album.name, maxTextW, fonts.bold, nameSize);
    const anchoTexto = Math.max(
      ...nameLines.map((l) => fonts.bold.widthOfTextAtSize(l, nameSize)),
      dateLabel ? fonts.italic.widthOfTextAtSize(dateLabel, dateSize) : 0,
      fonts.regular.widthOfTextAtSize(statsLine, statsSize),
    );

    return {
      nameSize, padX, padY, lineH, dateGap, footerGap, dateSize, statsSize, nameLines,
      alto: padY * 2 + nameLines.length * lineH + (dateLabel ? dateGap : 0) + footerGap,
      ancho: Math.min(anchoTexto + padX * 2, PAGE_WIDTH - MARGIN * 2),
    };
  };

  // El recorte vertical de la placa usa un margen propio, más ajustado que el
  // de las fotos: en los diseños donde la única franja libre queda pegada al
  // borde (p. ej. justo debajo de una etiqueta decorativa), el margen general
  // de página (50pt) dejaba muy poco hueco y forzaba a tapar el texto.
  const PLAQUE_MARGIN = 22;

  // Se mira la imagen para encontrar el hueco libre del tamaño exacto de la
  // placa. `cover.band` solo se usa si ese análisis no se puede hacer.
  let m = medidas(cover.compact === true);
  let hueco = templateBytes ? await huecoParaLaPlaca(templateBytes, m.ancho, m.alto) : null;

  // Si ni el mejor hueco está limpio, el diseño va lleno de borde a borde (una
  // corona de flores que ocupa la portada entera) y la placa grande no cabe en
  // ningún sitio sin comerse el dibujo. Antes eso se apañaba a mano marcando
  // `compact` plantilla por plantilla; ahora se prueba la pequeña y se queda
  // con ella solo si de verdad encuentra sitio mejor.
  if (hueco && hueco.suciedad > HUECO_LIMPIO && !cover.compact) {
    const chica = medidas(true);
    const otro = await huecoParaLaPlaca(templateBytes!, chica.ancho, chica.alto);
    if (otro && otro.suciedad < hueco.suciedad * 0.75) {
      m = chica;
      hueco = otro;
    }
  }

  // Ni encogiéndola hay sitio: la portada está pintada entera. Al pie, que es
  // lo único que se lee como aposta y no como un descuido.
  if (hueco && hueco.suciedad > PORTADA_LLENA) {
    hueco = { x: (PAGE_WIDTH - m.ancho) / 2, y: PLAQUE_MARGIN, suciedad: hueco.suciedad };
  }

  const { nameSize, padY, lineH, dateSize, statsSize, nameLines, alto, ancho } = m;
  const y = clamp(
    hueco?.y ?? PAGE_HEIGHT * (1 - cover.band) - alto / 2,
    PLAQUE_MARGIN,
    PAGE_HEIGHT - PLAQUE_MARGIN - alto,
  );
  const x = clamp(
    hueco?.x ?? (PAGE_WIDTH - ancho) / 2,
    PLAQUE_MARGIN,
    PAGE_WIDTH - PLAQUE_MARGIN - ancho,
  );

  // Sombra suave, placa color papel y un filete del color del diseño.
  drawRoundedBox(page, x + 3, y - 3, ancho, alto, 10, rgb(0.2, 0.17, 0.12), 0.12);
  drawRoundedBox(page, x, y, ancho, alto, 10, rgb(0.995, 0.985, 0.965), 0.93);
  page.drawLine({
    start: { x: x + ancho / 2 - 26, y: y + 13 },
    end: { x: x + ancho / 2 + 26, y: y + 13 },
    thickness: 1,
    color: cover.accent,
    opacity: 0.55,
  });

  // El texto se centra en la PLACA, no en la página: la placa puede haberse
  // corrido a un lado para no tapar el dibujo.
  const centroPlaca = x + ancho / 2;

  let cursor = y + alto - padY - nameSize * 0.85;
  for (const linea of nameLines) {
    drawCentered(page, linea, cursor, fonts.bold, nameSize, ink, centroPlaca);
    cursor -= lineH;
  }
  cursor += lineH - (cover.compact ? 20 : 24);

  if (dateLabel) {
    drawCentered(page, dateLabel, cursor, fonts.italic, dateSize, inkSoft, centroPlaca);
    cursor -= cover.compact ? 15 : 18;
  }
  drawCentered(page, statsLine, cursor, fonts.regular, statsSize, inkSoft, centroPlaca);
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
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  drawBackground(page, palette);

  // Cabecera discreta a juego con la portada, para que cada página se sienta
  // diseñada y no "una foto gigante pegada en blanco".
  drawCornerDecoration(page, 34, PAGE_HEIGHT - 34, -20, false, palette, index * 2 + 11);
  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 44, fonts.regular, 9, palette.inkFaint);

  const frameX = MARGIN + 12;
  const frameW = PAGE_WIDTH - (MARGIN + 12) * 2;
  const frameH = 420;
  const frameY = PAGE_HEIGHT - 96 - frameH;

  let embedded = false;
  // De los vídeos se imprime su fotograma de portada (los grabados antes de
  // que existiera no lo tienen y caen en el QR de siempre).
  const printable = item.type === "image" ? item.url : item.posterUrl;
  if (printable) {
    const image = await tryEmbedImage(pdf, printable, cache.get(printable));
    if (image) {
      const pad = 18;
      drawFrame(page, frameX, frameY, frameW, frameH, palette.accent);
      // "Contain" (no recorte) para la foto protagonista de la página: se ve
      // completa siempre, sea cual sea su proporción original.
      const innerW = frameW - pad * 2;
      const innerH = frameH - pad * 2;
      const scale = Math.min(innerW / image.width, innerH / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      page.drawImage(image, {
        x: frameX + (frameW - w) / 2,
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
        const qx = frameX + frameW - pad - qrSize;
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
  }

  if (!embedded) {
    drawFrame(page, frameX, frameY, frameW, frameH, palette.accent);
    page.drawRectangle({
      x: frameX + 18,
      y: frameY + 18,
      width: frameW - 36,
      height: frameH - 36,
      color: SAND,
    });
    const qrImage = await embedQr(pdf, item.url, 400);
    const qrSize = 200;
    page.drawImage(qrImage, {
      x: frameX + (frameW - qrSize) / 2,
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
  let y = frameY - (item.type === "video" && embedded ? 34 : 22);
  drawDivider(page, y, palette.accent);
  y -= 26;

  const caption = [
    item.uploaderName ? `Subido por ${item.uploaderName}` : "Anónimo",
    formatLongDate(item.takenAt ?? item.createdAt),
  ]
    .filter(Boolean)
    .join("  ·  ");
  page.drawText(caption, { x: frameX, y, size: 12, font: fonts.bold, color: palette.ink });

  if (reactionCount > 0) {
    const label = `${reactionCount} ${reactionCount === 1 ? "reacción" : "reacciones"}`;
    const w = fonts.regular.widthOfTextAtSize(label, 11);
    page.drawText(label, {
      x: frameX + frameW - w,
      y,
      size: 11,
      font: fonts.regular,
      color: palette.accent,
    });
  }
  y -= 22;

  for (const comment of comments.slice(0, 2)) {
    y = drawWrapped(page, `"${comment.slice(0, 160)}"`, frameX, y, frameW, 15, fonts.italic, 11, palette.inkFaint);
    y -= 18;
  }

  drawCentered(page, `${index} / ${total}`, 32, fonts.regular, 9, palette.inkFaint);
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
    y = PAGE_HEIGHT - MARGIN - 30;
    drawCentered(
      page,
      first ? "Dedicatorias" : "Dedicatorias (continuación)",
      y,
      fonts.bold,
      first ? 26 : 16,
      palette.ink,
    );
    y -= first ? 20 : 16;
    drawDivider(page, y, palette.accent);
    y -= 34;
  }

  startPage(true);

  for (const message of messages) {
    const lines = wrapLines(message.body.slice(0, 900), textW, fonts.italic, bodySize);
    const cardH = lines.length * lineHeight + 54;

    if (y - cardH < bottomLimit) startPage(false);
    const p = page!;

    // Nota: papel claro con una pestaña de color al costado.
    p.drawRectangle({
      x: MARGIN + 4,
      y: y - cardH - 4,
      width: cardW,
      height: cardH,
      color: rgb(0.2, 0.17, 0.12),
      opacity: 0.1,
    });
    p.drawRectangle({
      x: MARGIN,
      y: y - cardH,
      width: cardW,
      height: cardH,
      color: rgb(1, 1, 0.995),
      borderColor: palette.accent,
      borderWidth: 0.8,
    });
    p.drawRectangle({
      x: MARGIN,
      y: y - cardH,
      width: 5,
      height: cardH,
      color: palette.accent,
      opacity: 0.75,
    });

    // Comilla de apertura, a modo de adorno.
    p.drawText("“", {
      x: MARGIN + 14,
      y: y - 30,
      size: 34,
      font: fonts.bold,
      color: palette.accent,
      opacity: 0.35,
    });

    lines.forEach((line, i) => {
      p.drawText(line, {
        x: MARGIN + 30,
        y: y - 26 - i * lineHeight,
        size: bodySize,
        font: fonts.italic,
        color: palette.ink,
      });
    });

    const signature = `— ${message.authorName?.trim() || "Anónimo"} · ${formatLongDate(
      message.createdAt,
    )}`;
    const sigWidth = fonts.regular.widthOfTextAtSize(signature, 9.5);
    p.drawText(signature, {
      x: MARGIN + cardW - 18 - sigWidth,
      y: y - cardH + 16,
      size: 9.5,
      font: fonts.regular,
      color: palette.inkFaint,
    });

    y -= cardH + 18;
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
  const centerY = PAGE_HEIGHT / 2 + 60;

  drawCentered(page, "Gracias por compartir", centerY + 30, fonts.bold, 24, palette.ink);
  drawCentered(page, "estos recuerdos", centerY, fonts.bold, 24, palette.ink);

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

  const qrSize = 150;
  page.drawImage(qrImage, {
    x: (PAGE_WIDTH - qrSize) / 2,
    y: centerY - 220,
    width: qrSize,
    height: qrSize,
  });
  drawCentered(page, "Vuelve a ver el álbum en cualquier momento", centerY - 240, fonts.regular, 11, palette.inkSoft);
  drawCentered(page, "M E M O R I A S   V I V A S", MARGIN + 30, fonts.regular, 10, palette.inkFaint);
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
  const palette = isTemplateStyle(style)
    ? paletteFromAccent(TEMPLATE_COVERS[style].accent)
    : (PALETTES[style] ?? PALETTES.clasico);
  const pdf = await PDFDocument.create();
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
  let templateBytes: Uint8Array | null = null;
  if (isTemplateStyle(style)) {
    templateBytes = await leerPlantilla(TEMPLATE_COVERS[style].file);
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
      templateBytes,
    );
  } else {
    const previewImages: PDFImage[] = [];
    for (const url of portadasNecesarias) {
      const img = await tryEmbedImage(pdf, url, cache.get(url));
      if (img) previewImages.push(img);
    }
    addCoverPage(pdf, album, fonts, stats, previewImages, palette);
  }

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i];
    await addPhotoPage(
      pdf,
      fonts,
      item,
      extras.commentsByMedia.get(item.id) ?? [],
      extras.reactionCountByMedia.get(item.id) ?? 0,
      palette,
      i + 1,
      sorted.length,
      cache,
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
