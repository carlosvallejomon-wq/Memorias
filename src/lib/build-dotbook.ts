import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import type { albums, media } from "@/db/schema";

const PAGE_WIDTH = 595; // A4 a 72dpi
const PAGE_HEIGHT = 842;
const MARGIN = 50;

function formatDate(d: Date | null): string {
  if (!d) return "";
  return d.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

type Album = typeof albums.$inferSelect;
type MediaItem = typeof media.$inferSelect;

// Genera el "Dotbook digital": un PDF con una página por recuerdo, listo
// para guardar o imprimir. Los vídeos (y las fotos en formatos que un PDF no
// puede incrustar, como HEIC) se representan con un código QR que lleva
// directamente al recuerdo original — igual que hace Dots Memories en su
// libro físico.
export async function buildDotbookPdf(
  album: Album,
  items: MediaItem[],
  topCommentByMedia: Map<string, string>,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Dotbook · ${album.name}`);
  const font = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdf.embedFont(StandardFonts.Helvetica);

  const cover = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  cover.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: rgb(0.98, 0.96, 0.94),
  });
  cover.drawText("Memorias Vivas", {
    x: MARGIN,
    y: PAGE_HEIGHT - 120,
    size: 14,
    font: fontRegular,
    color: rgb(0.5, 0.45, 0.4),
  });
  cover.drawText(album.name, {
    x: MARGIN,
    y: PAGE_HEIGHT - 160,
    size: 28,
    font,
    color: rgb(0.17, 0.13, 0.09),
    maxWidth: PAGE_WIDTH - MARGIN * 2,
  });
  if (album.eventDate) {
    cover.drawText(
      new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
      {
        x: MARGIN,
        y: PAGE_HEIGHT - 190,
        size: 14,
        font: fontRegular,
        color: rgb(0.4, 0.35, 0.3),
      },
    );
  }
  cover.drawText(`${items.length} recuerdos compartidos`, {
    x: MARGIN,
    y: PAGE_HEIGHT - 215,
    size: 12,
    font: fontRegular,
    color: rgb(0.5, 0.45, 0.4),
  });

  for (const item of items) {
    const page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const contentTop = PAGE_HEIGHT - MARGIN;
    const frameWidth = PAGE_WIDTH - MARGIN * 2;
    const frameHeight = 620;
    const frameY = contentTop - frameHeight;

    let embedded: { width: number; height: number } | null = null;

    if (item.type === "image") {
      try {
        const res = await fetch(item.url);
        if (res.ok) {
          const bytes = new Uint8Array(await res.arrayBuffer());
          const contentType = res.headers.get("content-type") ?? "";
          const image = contentType.includes("png")
            ? await pdf.embedPng(bytes)
            : await pdf.embedJpg(bytes);
          const scale = Math.min(
            frameWidth / image.width,
            frameHeight / image.height,
          );
          const w = image.width * scale;
          const h = image.height * scale;
          page.drawImage(image, {
            x: MARGIN + (frameWidth - w) / 2,
            y: frameY + (frameHeight - h) / 2,
            width: w,
            height: h,
          });
          embedded = { width: w, height: h };
        }
      } catch (err) {
        console.error("No se pudo incrustar la imagen en el Dotbook:", err);
      }
    }

    if (!embedded) {
      page.drawRectangle({
        x: MARGIN,
        y: frameY,
        width: frameWidth,
        height: frameHeight,
        color: rgb(0.94, 0.9, 0.85),
      });
      const qrDataUrl = await QRCode.toDataURL(item.url, { margin: 1, width: 400 });
      const qrBytes = Buffer.from(qrDataUrl.split(",")[1], "base64");
      const qrImage = await pdf.embedPng(qrBytes);
      const qrSize = 220;
      page.drawImage(qrImage, {
        x: MARGIN + (frameWidth - qrSize) / 2,
        y: frameY + (frameHeight - qrSize) / 2 + 30,
        width: qrSize,
        height: qrSize,
      });
      page.drawText(
        item.type === "video"
          ? "Escanea para ver el vídeo"
          : "Escanea para ver la foto original",
        {
          x: MARGIN,
          y: frameY + (frameHeight - qrSize) / 2 - 10,
          size: 13,
          font: fontRegular,
          color: rgb(0.4, 0.35, 0.3),
        },
      );
    }

    const caption = [
      item.uploaderName ? `Subido por ${item.uploaderName}` : null,
      formatDate(item.takenAt ?? item.createdAt),
    ]
      .filter(Boolean)
      .join(" · ");
    page.drawText(caption, {
      x: MARGIN,
      y: frameY - 30,
      size: 12,
      font,
      color: rgb(0.25, 0.2, 0.15),
    });

    const comment = topCommentByMedia.get(item.id);
    if (comment) {
      page.drawText(`"${comment.slice(0, 140)}"`, {
        x: MARGIN,
        y: frameY - 52,
        size: 11,
        font: fontRegular,
        color: rgb(0.45, 0.4, 0.35),
        maxWidth: frameWidth,
      });
    }
  }

  return pdf.save();
}
