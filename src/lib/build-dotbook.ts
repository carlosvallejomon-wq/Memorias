import { PDFDocument, PDFFont, PDFPage, rgb, RGB, StandardFonts } from "pdf-lib";
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
const WINE = rgb(0.42, 0.15, 0.22);

function formatLongDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

function formatDayHeading(d: Date): string {
  const s = d.toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
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

// Envuelve texto a un ancho máximo; devuelve las líneas dibujadas.
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

// Marco tipo "paspartú" con una sombra sutil, como una foto pegada en un
// álbum físico en vez de una imagen a bordes vivos.
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

function addCoverPage(
  pdf: PDFDocument,
  album: Album,
  fonts: Fonts,
  stats: { total: number; uploaders: number; days: number },
  previewImages: { img: Awaited<ReturnType<PDFDocument["embedJpg"]>> }[],
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });
  page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 10, width: PAGE_WIDTH, height: 10, color: TERRACOTTA });
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 10, color: TERRACOTTA });

  drawCentered(page, "M E M O R I A S   V I V A S", PAGE_HEIGHT - 90, fonts.regular, 12, INK_FAINT);

  let y = drawWrapped(
    page,
    album.name,
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 160,
    PAGE_WIDTH - MARGIN * 2,
    38,
    fonts.bold,
    30,
    INK,
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
      INK_SOFT,
    );
    y -= 26;
  } else if (album.kind === "familia") {
    drawCentered(page, "Álbum de familia", y, fonts.italic, 14, INK_SOFT);
    y -= 26;
  }

  drawDivider(page, y, TERRACOTTA);
  y -= 30;

  const statsParts = [
    `${stats.total} ${stats.total === 1 ? "recuerdo" : "recuerdos"}`,
    stats.uploaders > 0
      ? `${stats.uploaders} ${stats.uploaders === 1 ? "invitado" : "invitados"}`
      : null,
    stats.days > 1 ? `${stats.days} días` : null,
  ].filter((v): v is string => !!v);
  drawCentered(page, statsParts.join("   ·   "), y, fonts.regular, 13, INK_FAINT);

  if (previewImages.length > 0) {
    const cols = Math.min(previewImages.length, 4);
    const tile = 100;
    const gap = 14;
    const totalW = cols * tile + (cols - 1) * gap;
    let x = (PAGE_WIDTH - totalW) / 2;
    const ty = 150;
    for (let i = 0; i < cols; i++) {
      const { img } = previewImages[i];
      const scale = Math.max(tile / img.width, tile / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      drawFrame(page, x, ty, tile, tile);
      page.drawImage(img, {
        x: x + (tile - w) / 2,
        y: ty + (tile - h) / 2,
        width: w,
        height: h,
      });
      // recorte simple de bordes: pdf-lib no admite clipping fácil aquí, así
      // que dejamos la imagen algo mayor que el marco solo si excede poco.
      x += tile + gap;
    }
  }
}

function addDayDivider(pdf: PDFDocument, fonts: Fonts, date: Date, count: number) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });
  const centerY = PAGE_HEIGHT / 2;
  drawCentered(page, "U N   D Í A   M Á S   D E   L A   H I S T O R I A", centerY + 50, fonts.italic, 11, WINE);
  drawCentered(page, formatDayHeading(date), centerY, fonts.bold, 26, INK);
  drawCentered(
    page,
    `${count} ${count === 1 ? "recuerdo" : "recuerdos"}`,
    centerY - 34,
    fonts.italic,
    13,
    INK_FAINT,
  );
  drawDivider(page, centerY - 70, TERRACOTTA);
}

async function addPhotoPage(
  pdf: PDFDocument,
  fonts: Fonts,
  item: MediaItem,
  comments: string[],
  reactionCount: number,
) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: CREAM });

  const frameX = MARGIN;
  const frameW = PAGE_WIDTH - MARGIN * 2;
  const frameH = 500;
  const frameY = PAGE_HEIGHT - MARGIN - 40 - frameH;

  let embedded = false;
  if (item.type === "image") {
    const image = await tryEmbedImage(pdf, item.url);
    if (image) {
      const pad = 18;
      const innerW = frameW - pad * 2;
      const innerH = frameH - pad * 2;
      const scale = Math.min(innerW / image.width, innerH / image.height);
      const w = image.width * scale;
      const h = image.height * scale;
      drawFrame(page, frameX, frameY, frameW, frameH);
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
      INK_SOFT,
    );
  }

  let y = frameY - 34;
  const caption = [
    item.uploaderName ? `Subido por ${item.uploaderName}` : "Anónimo",
    formatLongDate(item.takenAt ?? item.createdAt),
  ]
    .filter(Boolean)
    .join("  ·  ");
  page.drawText(caption, { x: frameX, y, size: 12, font: fonts.bold, color: INK });

  if (reactionCount > 0) {
    const label = `${reactionCount} ${reactionCount === 1 ? "reacción" : "reacciones"}`;
    const w = fonts.regular.widthOfTextAtSize(label, 11);
    page.drawText(label, {
      x: frameX + frameW - w,
      y,
      size: 11,
      font: fonts.regular,
      color: TERRACOTTA,
    });
  }
  y -= 22;

  for (const comment of comments.slice(0, 2)) {
    y = drawWrapped(page, `"${comment.slice(0, 160)}"`, frameX, y, frameW, 15, fonts.italic, 11, INK_FAINT);
    y -= 18;
  }
}

function addClosingPage(pdf: PDFDocument, fonts: Fonts, qrImage: Awaited<ReturnType<PDFDocument["embedPng"]>>) {
  const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: PAGE_HEIGHT, color: rgb(0.94, 0.9, 0.85) });
  const centerY = PAGE_HEIGHT / 2 + 60;

  drawCentered(page, "Gracias por compartir", centerY + 30, fonts.bold, 24, INK);
  drawCentered(page, "estos recuerdos", centerY, fonts.bold, 24, INK);

  const qrSize = 150;
  page.drawImage(qrImage, {
    x: (PAGE_WIDTH - qrSize) / 2,
    y: centerY - 220,
    width: qrSize,
    height: qrSize,
  });
  drawCentered(page, "Vuelve a ver el álbum en cualquier momento", centerY - 240, fonts.regular, 11, INK_SOFT);
  drawCentered(page, "M E M O R I A S   V I V A S", MARGIN + 30, fonts.regular, 10, INK_FAINT);
}

// Genera el "Dotbook digital": un PDF con capítulos por día, fotos
// enmarcadas, comentarios y reacciones — pensado para sentirse como un
// álbum de verdad, no una lista de imágenes sueltas. Los vídeos (y las
// fotos en formatos que un PDF no puede incrustar, como HEIC) se
// representan con un código QR que lleva directamente al recuerdo
// original — igual que hace Dots Memories en su libro físico.
export async function buildDotbookPdf(
  album: Album,
  items: MediaItem[],
  extras: DotbookExtras,
): Promise<Uint8Array> {
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
  const previewImages: { img: Awaited<ReturnType<PDFDocument["embedJpg"]>> }[] = [];
  for (const item of previewSourceImages) {
    const img = await tryEmbedImage(pdf, item.url);
    if (img) previewImages.push({ img });
  }

  addCoverPage(
    pdf,
    album,
    fonts,
    { total: sorted.length, uploaders: uploaders.size, days: days.size },
    previewImages,
  );

  let currentDay: string | null = null;
  for (const item of sorted) {
    const itemDate = item.takenAt ?? item.createdAt;
    const key = dayKey(itemDate);
    if (key !== currentDay) {
      currentDay = key;
      const count = sorted.filter((i) => dayKey(i.takenAt ?? i.createdAt) === key).length;
      addDayDivider(pdf, fonts, itemDate, count);
    }
    await addPhotoPage(
      pdf,
      fonts,
      item,
      extras.commentsByMedia.get(item.id) ?? [],
      extras.reactionCountByMedia.get(item.id) ?? 0,
    );
  }

  const closingQr = await embedQr(pdf, extras.shareUrl, 300);
  addClosingPage(pdf, fonts, closingQr);

  return pdf.save();
}
