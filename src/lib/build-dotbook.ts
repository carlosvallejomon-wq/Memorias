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
} from "pdf-lib";
import QRCode from "qrcode";
import type { albums, media } from "@/db/schema";

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

// Estilos de portada del Dotbook, inspirados en plantillas de portadas de
// álbum de referencia (familia/cálido con borde floral, elegante
// boda-graduación, fiesta infantil, gala oscura y dorada tipo "Mis 15
// años") — igual que los 4 estilos de invitación, pero para el PDF.
export type DotbookStyle = "clasico" | "elegante" | "fiesta" | "gala" | "navidad";

export const DOTBOOK_STYLES: { id: DotbookStyle; label: string }[] = [
  { id: "clasico", label: "Cálido floral" },
  { id: "elegante", label: "Elegante" },
  { id: "fiesta", label: "Fiesta" },
  { id: "gala", label: "Gala dorada" },
  { id: "navidad", label: "Navideño" },
];

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
  decoration: "branch" | "confetti";
  flowerColors?: RGB[];
  mandala?: boolean;
};

const PALETTES: Record<DotbookStyle, Palette> = {
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

export type DotbookExtras = {
  commentsByMedia: Map<string, string[]>;
  reactionCountByMedia: Map<string, number>;
  shareUrl: string;
};

type Fonts = { bold: PDFFont; regular: PDFFont; italic: PDFFont };

function drawCentered(
  page: PDFPage,
  text: string,
  y: number,
  font: PDFFont,
  size: number,
  color: RGB,
) {
  const width = font.widthOfTextAtSize(text, size);
  page.drawText(text, { x: (PAGE_WIDTH - width) / 2, y, size, font, color });
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
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
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
// (antes la sombra y la imagen podían quedar de tamaños distintos).
function drawFrame(page: PDFPage, x: number, y: number, w: number, h: number) {
  page.drawRectangle({ x: x + 5, y: y - 5, width: w, height: h, color: rgb(0.72, 0.65, 0.56), opacity: 0.3 });
  page.drawRectangle({ x, y, width: w, height: h, color: rgb(1, 1, 1) });
  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    borderColor: rgb(0.86, 0.81, 0.73),
    borderWidth: 1,
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

async function tryEmbedImage(pdf: PDFDocument, url: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.includes("png") ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
  } catch (err) {
    console.error("No se pudo incrustar la imagen en el Dotbook:", err);
    return null;
  }
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

// Ramas decorativas de esquina, sencillas pero con textura de scrapbook.
function drawCornerBranch(
  page: PDFPage,
  x: number,
  y: number,
  angleDeg: number,
  length: number,
  mirror: boolean,
  color: RGB,
) {
  page.pushOperators(
    pushGraphicsState(),
    translateOp(x, y),
    rotateOp(angleDeg),
  );
  const dir = mirror ? -1 : 1;
  page.drawLine({
    start: { x: 0, y: 0 },
    end: { x: dir * length, y: length * 0.25 },
    thickness: 1.5,
    color,
    opacity: 0.5,
  });
  for (const t of [0.25, 0.5, 0.75]) {
    const lx = dir * length * t;
    const ly = length * 0.25 * t;
    page.drawEllipse({
      x: lx,
      y: ly,
      xScale: 10,
      yScale: 5,
      rotate: degrees(dir * -30),
      color,
      opacity: 0.4,
    });
  }
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

function drawCornerDecoration(page: PDFPage, x: number, y: number, angleDeg: number, mirror: boolean, palette: Palette, seed: number) {
  if (palette.decoration === "confetti") {
    drawCornerConfetti(page, x, y, 70, 60, palette.tapeColors, seed);
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

async function addPhotoPage(
  pdf: PDFDocument,
  fonts: Fonts,
  item: MediaItem,
  comments: string[],
  reactionCount: number,
  palette: Palette,
  index: number,
  total: number,
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
  if (item.type === "image") {
    const image = await tryEmbedImage(pdf, item.url);
    if (image) {
      const pad = 18;
      drawFrame(page, frameX, frameY, frameW, frameH);
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
    }
  }

  if (!embedded) {
    drawFrame(page, frameX, frameY, frameW, frameH);
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

  let y = frameY - 22;
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

function addClosingPage(pdf: PDFDocument, fonts: Fonts, qrImage: PDFImage, palette: Palette) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: palette.bgClosing });
  const centerY = PAGE_HEIGHT / 2 + 60;

  drawCentered(page, "Gracias por compartir", centerY + 30, fonts.bold, 24, palette.ink);
  drawCentered(page, "estos recuerdos", centerY, fonts.bold, 24, palette.ink);

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
  const palette = PALETTES[style] ?? PALETTES.clasico;
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Dotbook · ${album.name}`);
  const fonts: Fonts = {
    bold: await pdf.embedFont(StandardFonts.TimesRomanBold),
    regular: await pdf.embedFont(StandardFonts.TimesRoman),
    italic: await pdf.embedFont(StandardFonts.TimesRomanItalic),
  };

  const sorted = [...items].sort((a, b) => {
    const da = (a.takenAt ?? a.createdAt).getTime();
    const db_ = (b.takenAt ?? b.createdAt).getTime();
    return da - db_;
  });

  const uploaders = new Set(
    sorted.map((i) => i.uploaderName).filter((n): n is string => !!n && n.trim().length > 0),
  );
  const days = new Set(sorted.map((i) => dayKey(i.takenAt ?? i.createdAt)));

  const previewSourceImages = sorted.filter((i) => i.type === "image").slice(0, 4);
  const previewImages: PDFImage[] = [];
  for (const item of previewSourceImages) {
    const img = await tryEmbedImage(pdf, item.url);
    if (img) previewImages.push(img);
  }

  addCoverPage(
    pdf,
    album,
    fonts,
    { total: sorted.length, uploaders: uploaders.size, days: days.size },
    previewImages,
    palette,
  );

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
    );
  }

  const closingQr = await embedQr(pdf, extras.shareUrl, 300);
  addClosingPage(pdf, fonts, closingQr, palette);

  return pdf.save();
}
