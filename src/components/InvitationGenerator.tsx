"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { upload } from "@vercel/blob/client";
import {
  encodeInvitationLink,
  type InvitationLinkState,
  type QrLayout,
  type TextLayout,
} from "@/lib/invitation-link";
import { MAX_INVITATION_PHOTOS } from "@/lib/limits";
import { PLANTILLA_POR_DEFECTO, plantillaDe } from "@/lib/invitation-styles";
import { SelectorPlantilla } from "@/components/InvitationTemplatePicker";
import { PartyPopper, X, Download, ImagePlus, QrCode, Save, Smartphone, Trash2 } from "lucide-react";

const CANVAS_W = 1000;
const CANVAS_H = 1400;

export type InvitationData = {
  albumName: string;
  eventDateLabel: string | null;
  time: string;
  location: string;
  hosts: string;
  rsvp: string;
  shareUrl: string;
};

type PhotoLayout = { x: number; y: number; size: number; shape: "circle" | "square" };
type SelectedKey = "text" | "detalles" | "qr" | "photo" | null;

export type Template = {
  id: string;
  label: string;
  swatch: string;
  bgImage?: string;
  canvasW: number;
  canvasH: number;
  decorate?: (ctx: CanvasRenderingContext2D) => void;
  defaultText: TextLayout;
  defaultQr: QrLayout;
};

const FONT_CHOICES = [
  { id: "serif", label: "Elegante", family: "Georgia, serif", weight: "700" },
  { id: "display", label: "Clásica", family: '"Playfair Display", serif', weight: "700" },
  { id: "script", label: "Manuscrita", family: '"Pinyon Script", cursive', weight: "" },
  { id: "sans", label: "Moderna", family: '"Poppins", sans-serif', weight: "800" },
] as const;

// Pinyon Script solo trae un peso (normal): pedirle 700 hace que el
// navegador no la resuelva y caiga a la tipografía de respaldo del stack.
function nameWeightFor(family: string): string {
  return FONT_CHOICES.find((f) => f.family === family)?.weight ?? "700";
}

const COLOR_SWATCHES = [
  "#2b2118",
  "#6b2737",
  "#16324f",
  "#3f5539",
  "#5a3a70",
  "#1a1a1a",
  "#ffffff",
  "#c9922a",
];

// --- Utilidades de dibujo compartidas -------------------------------------

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function loadStylesheet(id: string, href: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) {
      resolve();
      return;
    }
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    link.onload = () => resolve();
    link.onerror = () => resolve(); // si falla, se usan las tipografías de respaldo
    document.head.appendChild(link);
  });
}

// Si la petición de las tipografías se queda colgada (red lenta, Google
// Fonts bloqueado, sin conexión), no se puede dejar el editor esperando para
// siempre: pasado este tiempo se dibuja con las tipografías de respaldo.
const FONT_TIMEOUT_MS = 4000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

let fontsReady: Promise<void> | null = null;
export function ensureInvitationFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      await withTimeout(
        loadStylesheet(
          "mv-invite-fonts",
          "https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Poppins:ital,wght@0,600;0,700;0,800;1,500&family=Playfair+Display:ital,wght@0,700;1,400&display=swap",
        ),
        FONT_TIMEOUT_MS,
      );
      try {
        await withTimeout(
          Promise.all([
            document.fonts.load('120px "Pinyon Script"'),
            document.fonts.load('800 40px "Poppins"'),
            document.fonts.load('600 24px "Poppins"'),
            document.fonts.load('italic 500 20px "Poppins"'),
            document.fonts.load('700 40px "Playfair Display"'),
            document.fonts.load('italic 400 20px "Playfair Display"'),
          ]),
          FONT_TIMEOUT_MS,
        );
      } catch {
        // sin conexión o fuente bloqueada: seguimos con las tipografías de respaldo
      }
    })();
  }
  return fontsReady;
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(" ");
  let line = "";
  const lines: string[] = [];
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  lines.push(line);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  lines.forEach((l, i) => ctx.fillText(l, x, startY + i * lineHeight));
  return y + ((lines.length - 1) * lineHeight) / 2 + lineHeight * 0.6;
}

function detailLines(data: InvitationData): string[] {
  return [data.eventDateLabel, data.time, data.location].filter(
    (v): v is string => !!v && v.trim().length > 0,
  );
}

function hostLine(data: InvitationData): string | null {
  const hosts = data.hosts.trim();
  return hosts ? `Te invita: ${hosts}` : null;
}

function drawBranch(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  angleDeg: number,
  length: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((angleDeg * Math.PI) / 180);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.55;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(length * 0.5, -length * 0.2, length, 0);
  ctx.stroke();
  for (const t of [0.22, 0.45, 0.68, 0.88]) {
    const lx = length * t;
    const ly = -length * 0.2 * Math.sin(t * Math.PI);
    ctx.save();
    ctx.translate(lx, ly);
    ctx.rotate(-0.7);
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, 15, 6.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function drawScatterDots(ctx: CanvasRenderingContext2D, color: string) {
  const rng = mulberry32(7);
  ctx.fillStyle = color;
  for (let i = 0; i < 18; i++) {
    const edge = rng() < 0.5;
    const x = edge ? rng() * 160 + (rng() < 0.5 ? 0 : CANVAS_W - 160) : rng() * CANVAS_W;
    const y = rng() * CANVAS_H;
    ctx.globalAlpha = 0.25 + rng() * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, 3 + rng() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawConfetti(ctx: CanvasRenderingContext2D) {
  const colors = ["#f43f5e", "#fbbf24", "#34d399", "#60a5fa", "#a78bfa"];
  const rng = mulberry32(42);
  for (let i = 0; i < 70; i++) {
    const x = rng() * CANVAS_W;
    const y = rng() * CANVAS_H;
    const size = 6 + rng() * 10;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI * 2);
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)];
    ctx.globalAlpha = 0.45 + rng() * 0.3;
    if (rng() > 0.5) {
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawBalloon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  color: string,
) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);
  ctx.strokeStyle = "rgba(43,33,24,0.2)";
  ctx.lineWidth = 1.5 / scale;
  ctx.beginPath();
  ctx.moveTo(0, 58);
  ctx.quadraticCurveTo(12, 110, 0, 180);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 0, 42, 52, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(-7, 48);
  ctx.lineTo(7, 48);
  ctx.lineTo(0, 60);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.4)";
  ctx.beginPath();
  ctx.ellipse(-15, -18, 10, 17, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function nameFont(name: string, base: number, weight: string, family: string) {
  const size = name.length > 16 ? base * 0.72 : name.length > 10 ? base * 0.85 : base;
  return `${weight} ${size}px ${family}`;
}

function drawImageCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const ir = img.width / img.height;
  const tr = w / h;
  let sx = 0;
  let sy = 0;
  let sw = img.width;
  let sh = img.height;
  if (ir > tr) {
    sw = img.height * tr;
    sx = (img.width - sw) / 2;
  } else {
    sh = img.width / tr;
    sy = (img.height - sh) / 2;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

// --- Elementos arrastrables: dibujo, límites y arranque por defecto -------

function defaultPhotoLayout(canvasW: number, canvasH: number): PhotoLayout {
  const size = Math.round(Math.min(canvasW, canvasH) * 0.16);
  return { x: Math.round(canvasW * 0.2), y: Math.round(canvasH * 0.13), size, shape: "circle" };
}

function textBounds(l: TextLayout) {
  return { x: l.x, y: l.y + l.fontSize * 0.1, w: l.maxWidth + 30, h: l.fontSize * 2.2 };
}

function detailsBounds(l: TextLayout, lineCount: number) {
  const h = Math.max(1, lineCount) * l.fontSize * 1.35;
  return { x: l.x, y: l.y + h / 2 - l.fontSize * 0.6, w: l.maxWidth + 30, h: h + l.fontSize };
}

// Posición de partida de los datos: justo debajo del título, con la letra más
// pequeña. Así una plantilla que solo define el título sigue funcionando.
export function defaultDetailsLayout(t: TextLayout): TextLayout {
  return {
    ...t,
    y: Math.round(t.y + t.fontSize * 1.55),
    fontSize: Math.max(14, Math.round(t.fontSize * 0.5)),
  };
}
function qrBounds(l: QrLayout) {
  return { x: l.x, y: l.y + 20, w: l.size + 50, h: l.size + 90 };
}
function photoBounds(l: PhotoLayout) {
  const w = l.size + 20;
  return { x: l.x, y: l.y, w, h: w };
}
function inBounds(p: { x: number; y: number }, b: { x: number; y: number; w: number; h: number }) {
  return p.x >= b.x - b.w / 2 && p.x <= b.x + b.w / 2 && p.y >= b.y - b.h / 2 && p.y <= b.y + b.h / 2;
}

// Evita que al arrastrar o agrandar un elemento (sobre todo el QR, cuyo
// texto "Escanea..." queda debajo) termine fuera del lienzo o cortado.
function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), Math.max(min, max));
}

// El texto "Escanea..." bajo el QR crece con el QR (para que siga
// leyéndose a cualquier tamaño), pero el hueco entre el QR y el texto
// también crece con la letra, así el QR nunca queda encima del texto.
function qrCaptionSize(qrSize: number) {
  return Math.max(12, Math.round(qrSize * 0.12));
}
function qrCaptionGap(qrSize: number) {
  return Math.round(qrCaptionSize(qrSize) * 1.3) + 14;
}
function qrCaptionFootprint(qrSize: number) {
  return qrCaptionGap(qrSize) + Math.round(qrCaptionSize(qrSize) * 0.4);
}

function clampTextLayout(l: TextLayout, canvasW: number, canvasH: number): TextLayout {
  const halfW = l.maxWidth / 2;
  const estH = l.fontSize * 6.4;
  return {
    ...l,
    x: clamp(l.x, halfW, canvasW - halfW),
    y: clamp(l.y, l.fontSize * 0.6, canvasH - estH),
  };
}

function clampQrLayout(l: QrLayout, canvasW: number, canvasH: number): QrLayout {
  const half = l.size / 2;
  return {
    ...l,
    x: clamp(l.x, half + 14, canvasW - half - 14),
    y: clamp(l.y, half + 14, canvasH - half - 14 - qrCaptionFootprint(l.size)),
  };
}

function clampPhotoLayout(l: PhotoLayout, canvasW: number, canvasH: number): PhotoLayout {
  const half = l.size / 2;
  return { ...l, x: clamp(l.x, half, canvasW - half), y: clamp(l.y, half, canvasH - half) };
}

function drawTitleBlock(ctx: CanvasRenderingContext2D, l: TextLayout, title: string) {
  if (!title.trim()) return;
  ctx.textAlign = "center";
  ctx.fillStyle = l.color;
  ctx.font = nameFont(title, l.fontSize, nameWeightFor(l.fontFamily), l.fontFamily);
  wrapText(ctx, title, l.x, l.y, l.maxWidth, l.fontSize * 1.12);
}

// Fecha, hora, lugar, quién invita y confirmación: se dibujan como un bloque
// independiente para poder colocarlo donde pida cada diseño.
export function detailBlockLines(data: InvitationData): string[] {
  const host = hostLine(data);
  const lines = [...(host ? [host] : []), ...detailLines(data)];
  if (data.rsvp.trim()) lines.push(`Confirma tu asistencia: ${data.rsvp}`);
  return lines;
}

function drawDetailsBlock(ctx: CanvasRenderingContext2D, l: TextLayout, data: InvitationData) {
  const lines = detailBlockLines(data);
  if (lines.length === 0) return;
  ctx.textAlign = "center";
  ctx.fillStyle = l.color;
  ctx.globalAlpha = 0.9;
  let y = l.y;
  const host = hostLine(data);
  for (const line of lines) {
    ctx.font =
      host && line === host
        ? `italic ${Math.round(l.fontSize * 1.05)}px ${l.fontFamily}`
        : `${l.fontSize}px ${l.fontFamily}`;
    y = wrapText(ctx, line, l.x, y, l.maxWidth, l.fontSize * 1.25);
    y += l.fontSize * 1.35;
  }
  ctx.globalAlpha = 1;
}

function drawQrBlock(
  ctx: CanvasRenderingContext2D,
  l: QrLayout,
  qrImage: HTMLImageElement,
  accent: string,
) {
  const left = l.x - l.size / 2;
  const top = l.y - l.size / 2;
  ctx.fillStyle = "rgba(255,255,255,0.95)";
  roundRectPath(ctx, left - 14, top - 14, l.size + 28, l.size + 28, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.globalAlpha = 0.35;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, left - 14, top - 14, l.size + 28, l.size + 28, 14);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.drawImage(qrImage, left, top, l.size, l.size);

  ctx.textAlign = "center";
  ctx.fillStyle = accent;
  ctx.font = `600 ${qrCaptionSize(l.size)}px Georgia, serif`;
  ctx.fillText("Escanea para tus fotos y vídeos", l.x, top + l.size + qrCaptionGap(l.size));
}

function drawPhotoBlock(ctx: CanvasRenderingContext2D, l: PhotoLayout, img: HTMLImageElement) {
  const left = l.x - l.size / 2;
  const top = l.y - l.size / 2;
  ctx.save();
  ctx.beginPath();
  if (l.shape === "circle") {
    ctx.arc(l.x, l.y, l.size / 2, 0, Math.PI * 2);
  } else {
    roundRectPath(ctx, left, top, l.size, l.size, 16);
  }
  ctx.clip();
  drawImageCover(ctx, img, left, top, l.size, l.size);
  ctx.restore();

  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 6;
  ctx.beginPath();
  if (l.shape === "circle") {
    ctx.arc(l.x, l.y, l.size / 2, 0, Math.PI * 2);
  } else {
    roundRectPath(ctx, left, top, l.size, l.size, 16);
  }
  ctx.stroke();
}

function drawSelectionOutline(
  ctx: CanvasRenderingContext2D,
  selected: SelectedKey,
  textLayout: TextLayout,
  detailsLayout: TextLayout,
  detailCount: number,
  qrLayout: QrLayout,
  photoLayout: PhotoLayout | null,
) {
  let b: { x: number; y: number; w: number; h: number } | null = null;
  if (selected === "text") b = textBounds(textLayout);
  else if (selected === "detalles") b = detailsBounds(detailsLayout, detailCount);
  else if (selected === "qr") b = qrBounds(qrLayout);
  else if (selected === "photo" && photoLayout) b = photoBounds(photoLayout);
  if (!b) return;
  ctx.save();
  ctx.strokeStyle = "#ff5a36";
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.strokeRect(b.x - b.w / 2, b.y - b.h / 2, b.w, b.h);
  ctx.restore();
}

export function renderInvitation(
  ctx: CanvasRenderingContext2D,
  template: Template,
  data: InvitationData,
  textLayout: TextLayout,
  detailsLayout: TextLayout,
  qrLayout: QrLayout,
  photoLayout: PhotoLayout | null,
  bgImg: HTMLImageElement | null,
  qrImg: HTMLImageElement | null,
  photoImg: HTMLImageElement | null,
  selected: SelectedKey,
) {
  const w = template.canvasW;
  const h = template.canvasH;
  ctx.clearRect(0, 0, w, h);
  if (bgImg) ctx.drawImage(bgImg, 0, 0, w, h);
  template.decorate?.(ctx);
  if (photoLayout && photoImg) drawPhotoBlock(ctx, photoLayout, photoImg);
  drawTitleBlock(ctx, textLayout, data.albumName);
  drawDetailsBlock(ctx, detailsLayout, data);
  if (qrImg) drawQrBlock(ctx, qrLayout, qrImg, textLayout.color);
  if (selected)
    drawSelectionOutline(
      ctx,
      selected,
      textLayout,
      detailsLayout,
      detailBlockLines(data).length,
      qrLayout,
      photoLayout,
    );
}

// --- Decoraciones de las plantillas dibujadas (sin foto real) -------------

function decorateClasico(ctx: CanvasRenderingContext2D) {
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, "#fbf3e7");
  bg.addColorStop(0.55, "#faf6f0");
  bg.addColorStop(1, "#f3e4d2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "#c2571b";
  ctx.lineWidth = 3;
  ctx.strokeRect(50, 50, CANVAS_W - 100, CANVAS_H - 100);
  ctx.lineWidth = 1;
  ctx.strokeRect(64, 64, CANVAS_W - 128, CANVAS_H - 128);
  ctx.textAlign = "center";
  ctx.fillStyle = "#9c4514";
  ctx.font = "600 22px Georgia, serif";
  ctx.fillText("M E M O R I A S   V I V A S", CANVAS_W / 2, 170);
  ctx.fillStyle = "#6b2737";
  ctx.font = "italic 32px Georgia, serif";
  ctx.fillText("Estás invitado a", CANVAS_W / 2, 250);
}

function decorateFloral(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createRadialGradient(
    CANVAS_W / 2,
    CANVAS_H * 0.4,
    100,
    CANVAS_W / 2,
    CANVAS_H * 0.4,
    CANVAS_H * 0.9,
  );
  grad.addColorStop(0, "#faf5fc");
  grad.addColorStop(0.6, "#eee0f7");
  grad.addColorStop(1, "#d9bdec");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawBranch(ctx, 90, CANVAS_H - 90, -35, 360, "#8b5cf6");
  ctx.save();
  ctx.translate(CANVAS_W, 0);
  ctx.scale(-1, 1);
  drawBranch(ctx, 90, 90, -35, 360, "#8b5cf6");
  ctx.restore();
  drawScatterDots(ctx, "#ec4899");
  ctx.textAlign = "center";
  ctx.fillStyle = "#7c3aed";
  ctx.globalAlpha = 0.85;
  ctx.font = "italic 26px Georgia, serif";
  ctx.fillText("Acompáñanos a celebrar", CANVAS_W / 2, 250);
  ctx.globalAlpha = 1;
}

function decorateGeometrico(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, CANVAS_W, CANVAS_H);
  grad.addColorStop(0, "#9c4514");
  grad.addColorStop(1, "#2b2118");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.strokeStyle = "rgba(201,162,39,0.2)";
  ctx.lineWidth = 1;
  for (let i = -CANVAS_H; i < CANVAS_W; i += 60) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + CANVAS_H, CANVAS_H);
    ctx.stroke();
  }
  ctx.strokeStyle = "#c9a227";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CANVAS_W - 40, 40, 220, 0, Math.PI * 2);
  ctx.stroke();
  ctx.textAlign = "center";
  ctx.fillStyle = "#c9a227";
  ctx.font = "600 22px Poppins, sans-serif";
  ctx.fillText("E S T Á S   I N V I T A D O", CANVAS_W / 2, 230);
}

function decorateInfantil(ctx: CanvasRenderingContext2D) {
  const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  grad.addColorStop(0, "#fff3b0");
  grad.addColorStop(0.5, "#ffd6e8");
  grad.addColorStop(1, "#c8f0ff");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawConfetti(ctx);
  drawBalloon(ctx, 140, 160, 1, "#f43f5e");
  drawBalloon(ctx, 225, 105, 0.65, "#60a5fa");
  drawBalloon(ctx, CANVAS_W - 140, 160, 1, "#a78bfa");
  drawBalloon(ctx, CANVAS_W - 225, 105, 0.65, "#34d399");
  ctx.textAlign = "center";
  ctx.fillStyle = "#db2777";
  ctx.font = "700 24px Poppins, sans-serif";
  ctx.fillText("¡ESTÁS INVITADO A LA FIESTA DE!", CANVAS_W / 2, 400);
}

// --- Plantillas -------------------------------------------------------------

function defQrY(textY: number, canvasH: number) {
  return Math.min(textY + 480, canvasH - 260);
}

export const TEMPLATES: Template[] = [
  {
    id: "clasico",
    label: "Clásico cálido",
    swatch: "from-oro to-teja",
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    decorate: decorateClasico,
    defaultText: { x: 500, y: 340, fontSize: 62, fontFamily: "Georgia, serif", color: "#2b2118", maxWidth: 780 },
    defaultQr: { x: 500, y: defQrY(340, CANVAS_H), size: 220 },
  },
  {
    id: "floral",
    label: "Floral elegante",
    swatch: "from-vino to-oro",
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    decorate: decorateFloral,
    defaultText: {
      x: 500,
      y: 400,
      fontSize: 108,
      fontFamily: '"Pinyon Script", cursive',
      color: "#7c2d92",
      maxWidth: 820,
    },
    defaultQr: { x: 500, y: defQrY(400, CANVAS_H), size: 220 },
  },
  {
    id: "geometrico",
    label: "Geométrico dorado",
    swatch: "from-tinta to-teja-oscuro",
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    decorate: decorateGeometrico,
    defaultText: {
      x: 500,
      y: 350,
      fontSize: 68,
      fontFamily: '"Poppins", sans-serif',
      color: "#ffffff",
      maxWidth: 800,
    },
    defaultQr: { x: 500, y: defQrY(350, CANVAS_H), size: 220 },
  },
  {
    id: "infantil",
    label: "Fiesta infantil",
    swatch: "from-teja to-vino",
    canvasW: CANVAS_W,
    canvasH: CANVAS_H,
    decorate: decorateInfantil,
    defaultText: {
      x: 500,
      y: 500,
      fontSize: 118,
      fontFamily: '"Pinyon Script", cursive',
      color: "#7c3aed",
      maxWidth: 820,
    },
    defaultQr: { x: 500, y: defQrY(500, CANVAS_H), size: 220 },
  },
  {
    id: "quince-pastel",
    label: "Mis Quince (pastel)",
    swatch: "",
    bgImage: "/invitation-templates/quince-pastel.jpg",
    canvasW: 810,
    canvasH: 1440,
    defaultText: { x: 405, y: 810, fontSize: 36, fontFamily: "Georgia, serif", color: "#7a4a63", maxWidth: 560 },
    defaultQr: { x: 405, y: defQrY(810, 1440), size: 150 },
  },
  {
    id: "quince-purpura",
    label: "15 Años (morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-purpura.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 810, fontSize: 46, fontFamily: "Georgia, serif", color: "#f0e0fa", maxWidth: 760 },
    defaultQr: { x: 535, y: defQrY(810, 1499), size: 160 },
  },
  {
    id: "quince-lavanda",
    label: "Mis Quince (lavanda)",
    swatch: "",
    bgImage: "/invitation-templates/quince-lavanda.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 750, fontSize: 42, fontFamily: "Georgia, serif", color: "#3a2f52", maxWidth: 760 },
    defaultQr: { x: 535, y: 1395, size: 120 },
  },
  {
    id: "quince-botanico",
    label: "15 Años (botánico azul)",
    swatch: "",
    bgImage: "/invitation-templates/quince-botanico.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 890, fontSize: 46, fontFamily: "Georgia, serif", color: "#16324f", maxWidth: 780 },
    defaultQr: { x: 535, y: defQrY(890, 1500), size: 150 },
  },
  {
    id: "quince-sparkle",
    label: "15 Años (brillos)",
    swatch: "",
    bgImage: "/invitation-templates/quince-sparkle.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 630, fontSize: 44, fontFamily: "Georgia, serif", color: "#ffffff", maxWidth: 700 },
    defaultQr: { x: 535, y: defQrY(630, 1499), size: 130 },
  },
  {
    id: "quince-negrodorado",
    label: "15 Años (negro y oro)",
    swatch: "",
    bgImage: "/invitation-templates/quince-negrodorado.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 460, fontSize: 46, fontFamily: "Georgia, serif", color: "#d3a94e", maxWidth: 780 },
    defaultQr: { x: 535, y: defQrY(460, 1499), size: 150 },
  },
  {
    id: "quince-iris",
    label: "15 Años (iris morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-iris.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 640, fontSize: 42, fontFamily: "Georgia, serif", color: "#3a2f52", maxWidth: 760 },
    defaultQr: { x: 535, y: defQrY(640, 1500), size: 140 },
  },
  {
    id: "quince-ventana",
    label: "15 Años (bienvenidas beige)",
    swatch: "",
    bgImage: "/invitation-templates/quince-ventana.jpg",
    canvasW: 1080,
    canvasH: 1440,
    defaultText: { x: 540, y: 1010, fontSize: 38, fontFamily: "Georgia, serif", color: "#4a4a44", maxWidth: 780 },
    defaultQr: { x: 540, y: defQrY(1010, 1440), size: 110 },
  },
  {
    id: "quince-corona",
    label: "15 Años (corona rosa)",
    swatch: "",
    bgImage: "/invitation-templates/quince-corona.jpg",
    canvasW: 1080,
    canvasH: 1440,
    defaultText: { x: 540, y: 800, fontSize: 38, fontFamily: "Georgia, serif", color: "#8a5a52", maxWidth: 620 },
    defaultQr: { x: 540, y: defQrY(800, 1440), size: 110 },
  },
  {
    id: "quince-salvia",
    label: "15 Años (salvia acuarela)",
    swatch: "",
    bgImage: "/invitation-templates/quince-salvia.jpg",
    canvasW: 810,
    canvasH: 1440,
    defaultText: { x: 405, y: 570, fontSize: 32, fontFamily: "Georgia, serif", color: "#3f5539", maxWidth: 580 },
    defaultQr: { x: 405, y: defQrY(570, 1440), size: 110 },
  },
  {
    id: "quince-mostaza",
    label: "15 Años (floral mostaza)",
    swatch: "",
    bgImage: "/invitation-templates/quince-mostaza.jpg",
    canvasW: 810,
    canvasH: 1440,
    defaultText: { x: 405, y: 500, fontSize: 32, fontFamily: "Georgia, serif", color: "#7a5a1e", maxWidth: 600 },
    defaultQr: { x: 405, y: defQrY(500, 1440), size: 110 },
  },
  {
    id: "quince-guirnalda",
    label: "15 Años (guirnalda verde)",
    swatch: "",
    bgImage: "/invitation-templates/quince-guirnalda.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 540, fontSize: 30, fontFamily: "Georgia, serif", color: "#6b7a4a", maxWidth: 400 },
    defaultQr: { x: 535, y: defQrY(540, 1500), size: 100 },
  },
  {
    id: "quince-hortensia",
    label: "15 Años (hortensias azules)",
    swatch: "",
    bgImage: "/invitation-templates/quince-hortensia.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 480, fontSize: 40, fontFamily: "Georgia, serif", color: "#1a3a5f", maxWidth: 760 },
    defaultQr: { x: 535, y: defQrY(480, 1500), size: 140 },
  },
  {
    id: "quince-teal",
    label: "15 Años (guirnalda azul-teal)",
    swatch: "",
    bgImage: "/invitation-templates/quince-teal.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 400, fontSize: 40, fontFamily: "Georgia, serif", color: "#2c4a68", maxWidth: 780 },
    defaultQr: { x: 535, y: defQrY(400, 1500), size: 150 },
  },
  {
    id: "quince-rosas",
    label: "15 Años (rosas rosadas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-rosas.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 450, fontSize: 38, fontFamily: "Georgia, serif", color: "#a24a5a", maxWidth: 640 },
    defaultQr: { x: 535, y: defQrY(450, 1499), size: 130 },
  },
  {
    id: "quince-rosasdoradas",
    label: "15 Años (rosas doradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-rosasdoradas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 530, fontSize: 38, fontFamily: "Georgia, serif", color: "#1a1a1a", maxWidth: 780 },
    defaultQr: { x: 535, y: defQrY(530, 1500), size: 140 },
  },
  {
    id: "quince-menta",
    label: "15 Años (menta minimal)",
    swatch: "",
    bgImage: "/invitation-templates/quince-menta.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 660, fontSize: 32, fontFamily: "Georgia, serif", color: "#4a5238", maxWidth: 640 },
    defaultQr: { x: 535, y: defQrY(660, 1500), size: 120 },
  },
  {
    id: "quince-olivo",
    label: "15 Años (bloque olivo)",
    swatch: "",
    bgImage: "/invitation-templates/quince-olivo.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 530, fontSize: 38, fontFamily: "Georgia, serif", color: "#f5f0e0", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(530, 1500), size: 130 },
  },
  {
    id: "quince-minimal",
    label: "15 Años (minimalista)",
    swatch: "",
    bgImage: "/invitation-templates/quince-minimal.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 520, fontSize: 36, fontFamily: "Georgia, serif", color: "#1f1f1f", maxWidth: 760 },
    defaultQr: { x: 535, y: defQrY(520, 1500), size: 130 },
  },
  {
    id: "quince-tiara",
    label: "15 Años (tiara lavanda)",
    swatch: "",
    bgImage: "/invitation-templates/quince-tiara.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 700, fontSize: 36, fontFamily: "Georgia, serif", color: "#6a4a8a", maxWidth: 760 },
    defaultQr: { x: 542, y: defQrY(700, 1530), size: 130 },
  },
  {
    id: "quince-mariposas",
    label: "15 Años (mariposas azules)",
    swatch: "",
    bgImage: "/invitation-templates/quince-mariposas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 500, fontSize: 34, fontFamily: "Georgia, serif", color: "#3c4f7a", maxWidth: 660 },
    defaultQr: { x: 535, y: defQrY(500, 1500), size: 130 },
  },
  {
    id: "quince-peonias",
    label: "15 Años (peonías moradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-peonias.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 690, y: 420, fontSize: 32, fontFamily: "Georgia, serif", color: "#6b5266", maxWidth: 580 },
    defaultQr: { x: 690, y: defQrY(420, 1500), size: 120 },
  },
  {
    id: "quince-glitter",
    label: "15 Años (glitter morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-glitter.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 560, fontSize: 30, fontFamily: "Georgia, serif", color: "#5a3a70", maxWidth: 620 },
    defaultQr: { x: 535, y: 1015, size: 110 },
  },
  {
    id: "quince-margaritas",
    label: "15 Años (margaritas doradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-margaritas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 620, fontSize: 32, fontFamily: "Georgia, serif", color: "#5a6b3a", maxWidth: 700 },
    defaultQr: { x: 535, y: defQrY(620, 1500), size: 120 },
  },
  // --- Bautizo --------------------------------------------------------------
  {
    id: "bautizo-01",
    label: "Bautizo (ositos y paloma)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-01.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-02",
    label: "Bautizo (osito en las nubes)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-02.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 716, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(716, 1530), size: 150 },
  },
  {
    id: "bautizo-03",
    label: "Bautizo (arco rosa)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-03.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 656, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(656, 1530), size: 150 },
  },
  {
    id: "bautizo-04",
    label: "Bautizo (tres fotos)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-04.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 896, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(896, 1530), size: 150 },
  },
  {
    id: "bautizo-05",
    label: "Bautizo (lila floral)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-05.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 926, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(926, 1530), size: 150 },
  },
  {
    id: "bautizo-06",
    label: "Bautizo (globos azules)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-06.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-07",
    label: "Bautizo (cruz vino)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-07.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 896, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(896, 1530), size: 150 },
  },
  {
    id: "bautizo-08",
    label: "Bautizo (osito ángel)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-08.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 626, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(626, 1530), size: 150 },
  },
  {
    id: "bautizo-09",
    label: "Bautizo (marco crema)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-09.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 806, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(806, 1530), size: 150 },
  },
  {
    id: "bautizo-10",
    label: "Bautizo (azul acuarela)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-10.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 716, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(716, 1530), size: 150 },
  },
  {
    id: "bautizo-11",
    label: "Bautizo (angelito)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-11.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 596, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(596, 1530), size: 150 },
  },
  {
    id: "bautizo-12",
    label: "Bautizo (paloma azul)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-12.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 716, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(716, 1530), size: 150 },
  },
  {
    id: "bautizo-13",
    label: "Bautizo (bebé beige)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-13.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-14",
    label: "Bautizo (iglesia y ositos)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-14.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 836, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(836, 1530), size: 150 },
  },
  {
    id: "bautizo-15",
    label: "Bautizo (bendición)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-15.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 746, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(746, 1530), size: 150 },
  },
  {
    id: "bautizo-16",
    label: "Bautizo (cruz azul)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-16.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 806, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(806, 1530), size: 150 },
  },
  {
    id: "bautizo-17",
    label: "Bautizo (Virgen y niño)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-17.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 866, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(866, 1530), size: 150 },
  },
  {
    id: "bautizo-18",
    label: "Bautizo (lazo y flores)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-18.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-19",
    label: "Bautizo (arcoíris)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-19.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-20",
    label: "Bautizo (rosa con corona)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-20.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 596, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(596, 1530), size: 150 },
  },
  {
    id: "bautizo-21",
    label: "Bautizo (charro)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-21.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-22",
    label: "Bautizo (conejito)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-22.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 626, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(626, 1530), size: 150 },
  },
  {
    id: "bautizo-23",
    label: "Bautizo (elefante azul)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-23.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 596, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(596, 1530), size: 150 },
  },
  {
    id: "bautizo-24",
    label: "Bautizo (encaje rosa)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-24.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-25",
    label: "Bautizo (luna y bebé)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-25.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 596, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(596, 1530), size: 150 },
  },
  {
    id: "bautizo-26",
    label: "Bautizo (magnolias doradas)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-26.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-27",
    label: "Bautizo (mariposas)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-27.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 716, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(716, 1530), size: 150 },
  },
  {
    id: "bautizo-28",
    label: "Bautizo (moño azul)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-28.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 656, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(656, 1530), size: 150 },
  },
  {
    id: "bautizo-29",
    label: "Bautizo (corderito azul)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-29.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-30",
    label: "Bautizo (osito rosa)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-30.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 596, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(596, 1530), size: 150 },
  },
  {
    id: "bautizo-31",
    label: "Bautizo (niña y palomas)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-31.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 926, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(926, 1530), size: 150 },
  },
  {
    id: "bautizo-32",
    label: "Bautizo (rosario floral)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-32.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 948, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(948, 1530), size: 150 },
  },
  {
    id: "bautizo-33",
    label: "Bautizo (vela y pila)",
    swatch: "",
    bgImage: "/invitation-templates/bautizo-33.jpg",
    canvasW: 1085,
    canvasH: 1530,
    defaultText: { x: 542, y: 896, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 730 },
    defaultQr: { x: 542, y: defQrY(896, 1530), size: 150 },
  },
  // --- Primera comunión -----------------------------------------------------
  {
    id: "comunion-01",
    label: "Comunión (cruz floral)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-01.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 915, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(915, 1500), size: 150 },
  },
  {
    id: "comunion-02",
    label: "Comunión (niña, lila)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-02.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 825, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(825, 1500), size: 150 },
  },
  {
    id: "comunion-03",
    label: "Comunión (niño, verde)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-03.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 915, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(915, 1500), size: 150 },
  },
  {
    id: "comunion-04",
    label: "Comunión (cáliz dorado)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-04.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "comunion-05",
    label: "Comunión (rosa suave)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-05.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "comunion-06",
    label: "Comunión (azul floral)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-06.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 765, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(765, 1500), size: 150 },
  },
  {
    id: "comunion-07",
    label: "Comunión (flores y paloma)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-07.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 705, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(705, 1500), size: 150 },
  },
  {
    id: "comunion-08",
    label: "Comunión (niña, rosa)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-08.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 615, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(615, 1500), size: 150 },
  },
  {
    id: "comunion-09",
    label: "Comunión (verde campo)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-09.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "comunion-10",
    label: "Comunión (crema y dorado)",
    swatch: "",
    bgImage: "/invitation-templates/comunion-10.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  // --- Graduación -----------------------------------------------------------
  {
    id: "grad-01",
    label: "Graduación (azul noche)",
    swatch: "",
    bgImage: "/invitation-templates/grad-01.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-02",
    label: "Graduación (globos azules)",
    swatch: "",
    bgImage: "/invitation-templates/grad-02.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-03",
    label: "Graduación (libros y flores)",
    swatch: "",
    bgImage: "/invitation-templates/grad-03.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 885, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(885, 1500), size: 150 },
  },
  {
    id: "grad-04",
    label: "Graduación (rojo festivo)",
    swatch: "",
    bgImage: "/invitation-templates/grad-04.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-05",
    label: "Graduación (beige y dorado)",
    swatch: "",
    bgImage: "/invitation-templates/grad-05.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-06",
    label: "Graduación (trazo a mano)",
    swatch: "",
    bgImage: "/invitation-templates/grad-06.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-07",
    label: "Graduación (minimalista)",
    swatch: "",
    bgImage: "/invitation-templates/grad-07.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 825, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(825, 1500), size: 150 },
  },
  {
    id: "grad-08",
    label: "Graduación (girasoles)",
    swatch: "",
    bgImage: "/invitation-templates/grad-08.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 735, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(735, 1500), size: 150 },
  },
  {
    id: "grad-09",
    label: "Graduación (clásica crema)",
    swatch: "",
    bgImage: "/invitation-templates/grad-09.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "grad-10",
    label: "Graduación (globos dorados)",
    swatch: "",
    bgImage: "/invitation-templates/grad-10.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 765, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(765, 1500), size: 150 },
  },
  // --- Cumpleaños infantil --------------------------------------------------
  {
    id: "cumple-01",
    label: "Cumpleaños (granja)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-01.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 675, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(675, 1500), size: 150 },
  },
  {
    id: "cumple-02",
    label: "Cumpleaños (osita rosa)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-02.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-03",
    label: "Cumpleaños (casita de hadas)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-03.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-04",
    label: "Cumpleaños (astronauta)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-04.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 795, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(795, 1500), size: 150 },
  },
  {
    id: "cumple-05",
    label: "Cumpleaños (abejitas)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-05.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-06",
    label: "Cumpleaños (hada del bosque)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-06.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-07",
    label: "Cumpleaños (hada rosa)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-07.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-08",
    label: "Cumpleaños (animales del bosque)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-08.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "cumple-09",
    label: "Cumpleaños (safari)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-09.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 795, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(795, 1500), size: 150 },
  },
  {
    id: "cumple-10",
    label: "Cumpleaños (autobús)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-10.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 645, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(645, 1500), size: 150 },
  },
  {
    id: "cumple-11",
    label: "Cumpleaños (dinosaurios)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-11.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 645, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(645, 1500), size: 150 },
  },
  {
    id: "cumple-12",
    label: "Cumpleaños (espacio)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-12.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-13",
    label: "Cumpleaños (sirena)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-13.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-14",
    label: "Cumpleaños (conejita)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-14.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "cumple-15",
    label: "Cumpleaños (unicornios)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-15.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 765, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(765, 1500), size: 150 },
  },
  {
    id: "cumple-16",
    label: "Primer cumpleaños (osito)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-16.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 825, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(825, 1500), size: 150 },
  },
  {
    id: "cumple-17",
    label: "Cumpleaños (castillo lila)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-17.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "cumple-18",
    label: "Cumpleaños (castillo de princesa)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-18.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "cumple-19",
    label: "Cumpleaños (globos y tarta)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-19.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 705, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(705, 1500), size: 150 },
  },
  {
    id: "cumple-20",
    label: "Cumpleaños (azul y dorado)",
    swatch: "",
    bgImage: "/invitation-templates/cumple-20.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 705, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(705, 1500), size: 150 },
  },
  // --- Baby shower ---------------------------------------------------------
  {
    id: "baby-01",
    label: "Baby shower (globos rosa)",
    swatch: "",
    bgImage: "/invitation-templates/baby-01.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-02",
    label: "Baby shower (osito y regalos)",
    swatch: "",
    bgImage: "/invitation-templates/baby-02.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 645, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(645, 1500), size: 150 },
  },
  {
    id: "baby-03",
    label: "Baby shower (ropita tendida)",
    swatch: "",
    bgImage: "/invitation-templates/baby-03.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-04",
    label: "Baby shower (globos azules)",
    swatch: "",
    bgImage: "/invitation-templates/baby-04.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-05",
    label: "Baby shower (osito celeste)",
    swatch: "",
    bgImage: "/invitation-templates/baby-05.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-06",
    label: "Baby shower (globos aerostáticos)",
    swatch: "",
    bgImage: "/invitation-templates/baby-06.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 825, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(825, 1500), size: 150 },
  },
  {
    id: "baby-07",
    label: "Baby shower (animalitos)",
    swatch: "",
    bgImage: "/invitation-templates/baby-07.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "baby-08",
    label: "Baby shower (osito beige)",
    swatch: "",
    bgImage: "/invitation-templates/baby-08.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-09",
    label: "Baby shower (osita bailarina)",
    swatch: "",
    bgImage: "/invitation-templates/baby-09.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-10",
    label: "Baby shower (osito abrazado)",
    swatch: "",
    bgImage: "/invitation-templates/baby-10.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "baby-11",
    label: "Baby shower (conejita salvia)",
    swatch: "",
    bgImage: "/invitation-templates/baby-11.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "baby-12",
    label: "Baby shower (osita entre flores)",
    swatch: "",
    bgImage: "/invitation-templates/baby-12.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 915, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(915, 1500), size: 150 },
  },
  {
    id: "baby-13",
    label: "Baby shower (zapatitos rosa)",
    swatch: "",
    bgImage: "/invitation-templates/baby-13.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-14",
    label: "Baby shower (lazo rosa)",
    swatch: "",
    bgImage: "/invitation-templates/baby-14.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-15",
    label: "Baby shower (selva verde)",
    swatch: "",
    bgImage: "/invitation-templates/baby-15.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 38, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "baby-16",
    label: "Baby shower (osito cactus)",
    swatch: "",
    bgImage: "/invitation-templates/baby-16.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 795, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(795, 1500), size: 150 },
  },
  {
    id: "baby-17",
    label: "Baby shower (osito aviador)",
    swatch: "",
    bgImage: "/invitation-templates/baby-17.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-18",
    label: "Baby shower (tendal pastel)",
    swatch: "",
    bgImage: "/invitation-templates/baby-18.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "baby-19",
    label: "Baby shower (corazón rosa)",
    swatch: "",
    bgImage: "/invitation-templates/baby-19.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 765, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(765, 1500), size: 150 },
  },
  {
    id: "baby-20",
    label: "Baby shower (globo azul)",
    swatch: "",
    bgImage: "/invitation-templates/baby-20.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 38, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  // --- Bodas ---------------------------------------------------------------
  {
    id: "boda-01",
    label: "Boda (anillos y eucalipto)",
    swatch: "",
    bgImage: "/invitation-templates/boda-01.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 814, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(814, 1499), size: 150 },
  },
  {
    id: "boda-02",
    label: "Boda (novios ilustrados)",
    swatch: "",
    bgImage: "/invitation-templates/boda-02.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "boda-03",
    label: "Nuestra boda (salvia)",
    swatch: "",
    bgImage: "/invitation-templates/boda-03.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 585, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(585, 1500), size: 150 },
  },
  {
    id: "boda-04",
    label: "Nuestra boda (corazón verde)",
    swatch: "",
    bgImage: "/invitation-templates/boda-04.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "boda-05",
    label: "Boda (anillos dorados)",
    swatch: "",
    bgImage: "/invitation-templates/boda-05.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 885, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(885, 1500), size: 150 },
  },
  {
    id: "boda-06",
    label: "Boda (marco rosa)",
    swatch: "",
    bgImage: "/invitation-templates/boda-06.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 756, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(756, 1499), size: 150 },
  },
  {
    id: "boda-07",
    label: "Boda (girasoles)",
    swatch: "",
    bgImage: "/invitation-templates/boda-07.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 929, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(929, 1499), size: 150 },
  },
  {
    id: "boda-08",
    label: "Boda (rosas amarillas)",
    swatch: "",
    bgImage: "/invitation-templates/boda-08.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 735, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(735, 1500), size: 150 },
  },
  {
    id: "boda-09",
    label: "Boda (rosas azules)",
    swatch: "",
    bgImage: "/invitation-templates/boda-09.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 555, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(555, 1500), size: 150 },
  },
  {
    id: "boda-10",
    label: "Boda (azul noche y oro)",
    swatch: "",
    bgImage: "/invitation-templates/boda-10.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 40, fontFamily: "Georgia, serif", color: "#f6efe6", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "boda-11",
    label: "Boda (novios y follaje)",
    swatch: "",
    bgImage: "/invitation-templates/boda-11.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 855, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(855, 1500), size: 150 },
  },
  {
    id: "boda-12",
    label: "Boda (girasoles y oro)",
    swatch: "",
    bgImage: "/invitation-templates/boda-12.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 929, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(929, 1499), size: 150 },
  },
  {
    id: "boda-13",
    label: "Boda (marco dorado)",
    swatch: "",
    bgImage: "/invitation-templates/boda-13.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 765, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(765, 1500), size: 150 },
  },
  {
    id: "boda-14",
    label: "Boda (corazón floral)",
    swatch: "",
    bgImage: "/invitation-templates/boda-14.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 795, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(795, 1500), size: 150 },
  },
  {
    id: "boda-15",
    label: "Boda (perlas y oro)",
    swatch: "",
    bgImage: "/invitation-templates/boda-15.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 785, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(785, 1499), size: 150 },
  },
  {
    id: "boda-16",
    label: "Boda (azul índigo)",
    swatch: "",
    bgImage: "/invitation-templates/boda-16.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
  {
    id: "boda-17",
    label: "Boda (rosa y oro)",
    swatch: "",
    bgImage: "/invitation-templates/boda-17.jpg",
    canvasW: 1071,
    canvasH: 1499,
    defaultText: { x: 535, y: 698, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(698, 1499), size: 150 },
  },
  {
    id: "boda-18",
    label: "Boda (acuarela suave)",
    swatch: "",
    bgImage: "/invitation-templates/boda-18.jpg",
    canvasW: 1071,
    canvasH: 1500,
    defaultText: { x: 535, y: 930, fontSize: 40, fontFamily: "Georgia, serif", color: "#2f2a24", maxWidth: 720 },
    defaultQr: { x: 535, y: defQrY(930, 1500), size: 150 },
  },
];

// Familias de plantillas, para no soltar las 46 de golpe en la rejilla.
export const TEMPLATE_GROUPS = [
  { id: "todas", label: "Todas" },
  { id: "boda", label: "Bodas" },
  { id: "quince", label: "15 años" },
  { id: "baby", label: "Baby shower" },
  { id: "cumple", label: "Cumpleaños" },
  { id: "bautizo", label: "Bautizo" },
  { id: "comunion", label: "Comunión" },
  { id: "graduacion", label: "Graduación" },
  { id: "otras", label: "Otras" },
];

export function templateGroup(id: string): string {
  if (id.startsWith("boda-")) return "boda";
  if (id.startsWith("quince-")) return "quince";
  if (id.startsWith("baby-")) return "baby";
  if (id.startsWith("cumple-")) return "cumple";
  if (id.startsWith("comunion-")) return "comunion";
  if (id.startsWith("bautizo-")) return "bautizo";
  if (id.startsWith("grad-")) return "graduacion";
  return "otras";
}

export {
  encodeInvitationLink,
  decodeInvitationLink,
  parseInvitationState,
} from "@/lib/invitation-link";
export type { InvitationLinkState, QrLayout, TextLayout } from "@/lib/invitation-link";

// --- Componente ---------------------------------------------------------

export function InvitationGenerator({
  albumName,
  eventDateLabel,
  shareUrl,
  initiallyOpen = false,
  hideTrigger = false,
  onClose,
  saveToken,
  savedInvitation,
}: {
  albumName: string;
  eventDateLabel: string | null;
  shareUrl: string;
  initiallyOpen?: boolean;
  hideTrigger?: boolean;
  onClose?: () => void;
  /** Permiso para guardar; lo calculan las pantallas que montan el editor. */
  saveToken?: string;
  /** Lo guardado la última vez, para seguir editando donde se dejó. */
  savedInvitation?: InvitationLinkState | null;
}) {
  const [open, setOpen] = useState(initiallyOpen);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [group, setGroup] = useState("todas");
  const [date, setDate] = useState(eventDateLabel ?? "");
  const [title, setTitle] = useState(albumName);
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [hosts, setHosts] = useState("");
  const [rsvp, setRsvp] = useState("");
  const [automaticRsvp, setAutomaticRsvp] = useState(false);
  const [interactive, setInteractive] = useState(false);
  const [plantillaId, setPlantillaId] = useState(PLANTILLA_POR_DEFECTO.id);
  const [startsAt, setStartsAt] = useState("");
  const [mapUrl, setMapUrl] = useState("");
  const [dressCode, setDressCode] = useState("");
  const [timeline, setTimeline] = useState("");
  const [musicUrl, setMusicUrl] = useState("");
  const [sealInitials, setSealInitials] = useState("");
  const [palette, setPalette] = useState("");
  const [avoidColors, setAvoidColors] = useState("");
  const [notes, setNotes] = useState("");
  const [hashtag, setHashtag] = useState("");
  const [showGallery, setShowGallery] = useState(true);
  const [collectWishes, setCollectWishes] = useState(true);
  // Fotos de los dueños del evento. Se suben al preparar la invitación,
  // cuando el álbum todavía está vacío, así que no pueden salir de ahí.
  const [coverPhoto, setCoverPhoto] = useState("");
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [padrinos, setPadrinos] = useState("");
  const [ceremonia, setCeremonia] = useState("");
  const [ceremoniaHora, setCeremoniaHora] = useState("");
  const [ceremoniaMapa, setCeremoniaMapa] = useState("");
  const [recepcion, setRecepcion] = useState("");
  const [recepcionHora, setRecepcionHora] = useState("");
  const [recepcionMapa, setRecepcionMapa] = useState("");
  const [mesaRegalos, setMesaRegalos] = useState("");
  const [datosBanco, setDatosBanco] = useState("");
  const [hospedaje, setHospedaje] = useState("");
  const [pedirCanciones, setPedirCanciones] = useState(true);
  const [subiendoFoto, setSubiendoFoto] = useState<"portada" | "galeria" | null>(null);
  const [errorFoto, setErrorFoto] = useState<string | null>(null);
  // Vista previa de la invitación web dentro del propio editor: sin ella hay
  // que rellenar los campos a ciegas y abrir el enlace en otra pestaña.
  const [vista, setVista] = useState<"imagen" | "web">("imagen");
  const [urlVista, setUrlVista] = useState<string | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(Boolean(savedInvitation));
  const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
  const [enlaceGuardado, setEnlaceGuardado] = useState<string | null>(null);
  const [enlaceCopiado, setEnlaceCopiado] = useState(false);

  const albumCode = shareUrl.match(/\/a\/([^/?#]+)/)?.[1] ?? null;
  const puedeGuardar = Boolean(saveToken && albumCode);

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const data: InvitationData = {
    albumName: title,
    eventDateLabel: date.trim() || null,
    time,
    location,
    hosts,
    rsvp,
    shareUrl,
  };

  const [textLayout, setTextLayout] = useState<TextLayout>(() => ({ ...TEMPLATES[0].defaultText }));
  const [detailsLayout, setDetailsLayout] = useState<TextLayout>(() =>
    defaultDetailsLayout(TEMPLATES[0].defaultText),
  );
  const [qrLayout, setQrLayout] = useState<QrLayout>(() => ({ ...TEMPLATES[0].defaultQr }));
  const [photoLayout, setPhotoLayout] = useState<PhotoLayout | null>(null);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<SelectedKey>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [invitationLinkQr, setInvitationLinkQr] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);
  const [visibleTemplateLimit, setVisibleTemplateLimit] = useState(18);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{
    key: "text" | "detalles" | "qr" | "photo";
    offX: number;
    offY: number;
  } | null>(null);

  // Lo guardado la última vez vuelve a los campos, para poder seguir
  // preparando la invitación en varias sentadas en vez de empezar de cero.
  const yaCargado = useRef(false);
  useEffect(() => {
    if (!open || yaCargado.current || !savedInvitation) return;
    yaCargado.current = true;
    const v = savedInvitation;
    setTemplateId(v.t);
    setTitle(v.n);
    setDate(v.d ?? "");
    setTime(v.h ?? "");
    setLocation(v.l ?? "");
    setHosts(v.o ?? "");
    setRsvp(v.r ?? "");
    setTextLayout(v.tx);
    setDetailsLayout(v.dx ?? defaultDetailsLayout(v.tx));
    setQrLayout(v.q);
    setAutomaticRsvp(Boolean(v.ar));
    setInteractive(Boolean(v.it));
    // Se hidrata una sola vez al abrir el editor. Es estado de formulario
    // guardado, no una reacción a cada cambio del usuario.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (v.iv) setPlantillaId(plantillaDe(v.iv).id);
    setStartsAt(v.st ?? "");
    setMapUrl(v.mp ?? "");
    setDressCode(v.dr ?? "");
    setTimeline(v.tl ?? "");
    setMusicUrl(v.ms ?? "");
    setSealInitials(v.si ?? "");
    setPalette(v.pa ?? "");
    setAvoidColors(v.ev ?? "");
    setNotes(v.av ?? "");
    setHashtag(v.hg ?? "");
    setShowGallery(v.ga !== false);
    setCollectWishes(v.bd !== false);
    setCoverPhoto(v.fp ?? "");
    setGalleryPhotos(v.fg ?? []);
    setPadrinos(v.pd ?? "");
    setCeremonia(v.ce ?? "");
    setCeremoniaHora(v.ch ?? "");
    setCeremoniaMapa(v.cm ?? "");
    setRecepcion(v.re ?? "");
    setRecepcionHora(v.rh ?? "");
    setRecepcionMapa(v.rm ?? "");
    setMesaRegalos(v.mr ?? "");
    setDatosBanco(v.cl ?? "");
    setHospedaje(v.ho ?? "");
    setPedirCanciones(v.sc !== false);
  }, [open, savedInvitation]);

  function chooseTemplate(next: Template) {
    setTemplateId(next.id);
    setTextLayout({ ...next.defaultText });
    setDetailsLayout(defaultDetailsLayout(next.defaultText));
    setQrLayout({ ...next.defaultQr });
    setPhotoLayout(null);
    setPhotoImg(null);
    setSelected(null);
    if (next.id !== templateId) setBgImg(null);
    setInvitationLinkQr(null);
  }

  useEffect(() => {
    if (!open) return;
    ensureInvitationFonts().then(() => setFontsLoaded(true));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    QRCode.toDataURL(shareUrl, { margin: 1, width: 480 })
      .then(loadImage)
      .then((img) => {
        if (!cancelled) setQrImg(img);
      });
    return () => {
      cancelled = true;
    };
  }, [open, shareUrl]);

  useEffect(() => {
    if (!template.bgImage) return;
    let cancelled = false;
    loadImage(template.bgImage).then((img) => {
      if (!cancelled) setBgImg(img);
    });
    return () => {
      cancelled = true;
    };
  }, [template.bgImage]);

  // El panel de texto actúa sobre el bloque seleccionado en el lienzo; si no
  // hay ninguno, sobre el título.
  const editing: "text" | "detalles" = selected === "detalles" ? "detalles" : "text";
  const editingLayout = editing === "detalles" ? detailsLayout : textLayout;
  const setEditingLayout = editing === "detalles" ? setDetailsLayout : setTextLayout;

  const visibleTemplates =
    group === "todas" ? TEMPLATES : TEMPLATES.filter((t) => templateGroup(t.id) === group);
  const shownTemplates = visibleTemplates.slice(0, visibleTemplateLimit);


  const ready = fontsLoaded && !!qrImg && (!template.bgImage || !!bgImg);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = template.canvasW;
    canvas.height = template.canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderInvitation(ctx, template, data, textLayout, detailsLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    template,
    textLayout,
    detailsLayout,
    qrLayout,
    photoLayout,
    bgImg,
    qrImg,
    photoImg,
    selected,
    title,
    date,
    time,
    location,
    hosts,
    rsvp,
    shareUrl,
  ]);

  function getCanvasPoint(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: ((e.clientX - rect.left) / rect.width) * template.canvasW,
      y: ((e.clientY - rect.top) / rect.height) * template.canvasH,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!ready) return;
    const p = getCanvasPoint(e);
    let hit: "text" | "detalles" | "qr" | "photo" | null = null;
    let anchor = { x: 0, y: 0 };
    if (photoLayout && inBounds(p, photoBounds(photoLayout))) {
      hit = "photo";
      anchor = photoLayout;
    } else if (inBounds(p, qrBounds(qrLayout))) {
      hit = "qr";
      anchor = qrLayout;
    } else if (
      detailBlockLines(data).length > 0 &&
      inBounds(p, detailsBounds(detailsLayout, detailBlockLines(data).length))
    ) {
      hit = "detalles";
      anchor = detailsLayout;
    } else if (data.albumName.trim() && inBounds(p, textBounds(textLayout))) {
      hit = "text";
      anchor = textLayout;
    }
    setSelected(hit);
    if (hit) {
      dragRef.current = { key: hit, offX: p.x - anchor.x, offY: p.y - anchor.y };
      canvasRef.current?.setPointerCapture(e.pointerId);
    }
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!dragRef.current) return;
    const p = getCanvasPoint(e);
    const { key, offX, offY } = dragRef.current;
    const nx = p.x - offX;
    const ny = p.y - offY;
    const w = template.canvasW;
    const h = template.canvasH;
    if (key === "text") setTextLayout((l) => clampTextLayout({ ...l, x: nx, y: ny }, w, h));
    if (key === "detalles") setDetailsLayout((l) => clampTextLayout({ ...l, x: nx, y: ny }, w, h));
    if (key === "qr") setQrLayout((l) => clampQrLayout({ ...l, x: nx, y: ny }, w, h));
    if (key === "photo")
      setPhotoLayout((l) => (l ? clampPhotoLayout({ ...l, x: nx, y: ny }, w, h) : l));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  function handlePhotoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      loadImage(reader.result as string).then((img) => {
        setPhotoImg(img);
        setPhotoLayout(defaultPhotoLayout(template.canvasW, template.canvasH));
        setSelected("photo");
      });
    };
    reader.readAsDataURL(file);
  }

  function handleDownload() {
    const canvas = canvasRef.current;
    if (!canvas || !ready) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderInvitation(ctx, template, data, textLayout, detailsLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, null);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitacion.png";
    a.click();
    renderInvitation(ctx, template, data, textLayout, detailsLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, selected);
  }

  async function handleGenerateInvitationLink() {
    setGeneratingLink(true);
    try {
      const url = enlaceDeLaInvitacion();
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480 });
      setInvitationLinkQr(qrDataUrl);
    } finally {
      setGeneratingLink(false);
    }
  }

  /** Todo lo que el organizador ha rellenado, listo para compartir o previsualizar. */
  function estadoDeLaInvitacion(): InvitationLinkState {
    return {
      t: templateId,
      n: title,
      d: date.trim() || undefined,
      h: time.trim() || undefined,
      l: location.trim() || undefined,
      o: hosts.trim() || undefined,
      r: rsvp.trim() || undefined,
      u: shareUrl,
      tx: textLayout,
      dx: detailsLayout,
      q: qrLayout,
      ar: automaticRsvp || undefined,
      it: interactive || undefined,
      iv: interactive ? plantillaId : undefined,
      st: startsAt || undefined,
      mp: mapUrl.trim() || undefined,
      dr: dressCode.trim() || undefined,
      tl: timeline.trim() || undefined,
      ms: musicUrl.trim() || undefined,
      si: sealInitials.trim() || undefined,
      pa: palette.trim() || undefined,
      ev: avoidColors.trim() || undefined,
      av: notes.trim() || undefined,
      hg: hashtag.trim().replace(/^#/, "") || undefined,
      ga: interactive ? showGallery : undefined,
      bd: interactive ? collectWishes : undefined,
      fp: coverPhoto || undefined,
      fg: galleryPhotos.length > 0 ? galleryPhotos : undefined,
      pd: padrinos.trim() || undefined,
      ce: ceremonia.trim() || undefined,
      ch: ceremoniaHora.trim() || undefined,
      cm: ceremoniaMapa.trim() || undefined,
      re: recepcion.trim() || undefined,
      rh: recepcionHora.trim() || undefined,
      rm: recepcionMapa.trim() || undefined,
      mr: mesaRegalos.trim() || undefined,
      cl: datosBanco.trim() || undefined,
      ho: hospedaje.trim() || undefined,
      sc: interactive ? pedirCanciones : undefined,
    };
  }

  function enlaceDeLaInvitacion(): string {
    return `${window.location.origin}/invitacion?d=${encodeInvitationLink(estadoDeLaInvitacion())}`;
  }

  /**
   * Sube una foto de los dueños del evento. Va por el mismo camino que las
   * de los invitados (directa a Vercel Blob), pero marcada como "invitacion":
   * no se registra como recuerdo, así que no aparece en la galería del álbum
   * ni gasta su cupo.
   */
  async function subirFoto(archivo: File, destino: "portada" | "galeria") {
    if (!albumCode) {
      setErrorFoto("No se pudo identificar el álbum.");
      return;
    }
    setErrorFoto(null);
    setSubiendoFoto(destino);
    try {
      // Convierte los HEIC del iPhone; sin esto la foto no se ve en Android.
      const { prepareForUpload } = await import("@/lib/prepare-upload");
      const { file } = await prepareForUpload(archivo);
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/blob-upload",
        clientPayload: JSON.stringify({ code: albumCode, kind: "invitacion" }),
      });
      if (destino === "portada") setCoverPhoto(blob.url);
      else setGalleryPhotos((fotos) => [...fotos, blob.url].slice(0, MAX_INVITATION_PHOTOS));
    } catch (err) {
      setErrorFoto(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setSubiendoFoto(null);
    }
  }

  /**
   * Guarda la invitación en el álbum. A partir de ahí el enlace y el QR son
   * fijos: se puede volver a este editor, cambiar lo que sea y guardar otra
   * vez sin repartir nada nuevo.
   */
  async function guardarInvitacion() {
    if (!puedeGuardar || !albumCode) return;
    setGuardando(true);
    setErrorGuardar(null);
    try {
      const respuesta = await fetch(`/api/invitaciones/${encodeURIComponent(albumCode)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ k: saveToken, data: estadoDeLaInvitacion() }),
      });
      if (!respuesta.ok) {
        const cuerpo = (await respuesta.json().catch(() => ({}))) as { error?: string };
        throw new Error(cuerpo.error ?? "No se pudo guardar la invitación.");
      }
      const enlace = `${window.location.origin}/i/${albumCode}`;
      setEnlaceGuardado(enlace);
      setGuardado(true);
      setInvitationLinkQr(await QRCode.toDataURL(enlace, { margin: 1, width: 480 }));
    } catch (err) {
      setErrorGuardar(err instanceof Error ? err.message : "No se pudo guardar la invitación.");
    } finally {
      setGuardando(false);
    }
  }

  /** Refresca el móvil de la derecha con lo que hay escrito ahora mismo. */
  function refrescarVista() {
    setUrlVista(`${enlaceDeLaInvitacion()}&abierto=1&v=${Date.now()}`);
  }

  function closeEditor() {
    setOpen(false);
    onClose?.();
  }

  return (
    <>
      {!hideTrigger && (
        <button
          onClick={() => setOpen(true)}
          className="btn btn-soft shimmer px-4 py-2 text-sm"
        >
          <PartyPopper size={16} /> Invitación
        </button>
      )}

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={closeEditor}
        >
          <div
            className="glass flex max-h-[92vh] w-full max-w-5xl flex-col gap-4 rounded-2xl p-4 sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Cabecera fija: el diálogo ya no se desplaza entero, solo la
                columna de controles. */}
            <div className="flex shrink-0 items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <PartyPopper size={18} className="text-teja" /> Invitación
              </h2>
              <button
                onClick={closeEditor}
                className="rounded-full bg-white/70 p-1.5 transition hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="order-2 min-h-0 overflow-y-auto pr-1 md:order-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                Plantilla
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TEMPLATE_GROUPS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGroup(g.id);
                      setVisibleTemplateLimit(18);
                    }}
                    className={`chip ${group === g.id ? "chip-active" : ""}`}
                  >
                    {g.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-tinta/50">
                {visibleTemplates.length} diseños · desliza para ver más
              </p>
              <div className="mt-1.5 grid max-h-72 grid-cols-4 gap-2 overflow-y-auto rounded-xl border border-tinta/10 bg-white/40 p-2 sm:grid-cols-5 lg:grid-cols-6">
                {shownTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => chooseTemplate(t)}
                    title={t.label}
                    className={`aspect-[5/7] overflow-hidden rounded-lg shadow-soft transition ${
                      t.swatch ? `bg-gradient-to-br ${t.swatch}` : ""
                    } ${templateId === t.id ? "ring-2 ring-teja ring-offset-2" : "opacity-70"}`}
                  >
                    {t.bgImage && (
                       
                      <img
                        src={t.bgImage}
                        alt={t.label}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    )}
                  </button>
                ))}
              </div>
              {shownTemplates.length < visibleTemplates.length && (
                <button
                  onClick={() => setVisibleTemplateLimit((limit) => limit + 18)}
                  className="mt-2 w-full rounded-lg border border-tinta/15 bg-white/60 py-2 text-xs font-semibold text-teja transition hover:bg-white"
                >
                  Ver 18 diseños más
                </button>
              )}
              <p className="mt-1.5 text-xs text-tinta/50">
                {TEMPLATES.find((t) => t.id === templateId)?.label}
              </p>

              <div className="mt-4 flex flex-col gap-3">
                <label className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                  Título de la invitación
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Título (déjalo vacío para no poner ninguno)"
                  maxLength={120}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                {title !== albumName && (
                  <button
                    onClick={() => setTitle(albumName)}
                    className="self-start text-xs text-teja hover:underline"
                  >
                    Usar el nombre del álbum ({albumName})
                  </button>
                )}
                <input
                  value={hosts}
                  onChange={(e) => setHosts(e.target.value)}
                  placeholder="Quién invita (opcional, p. ej. Familia Pérez)"
                  maxLength={100}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                <input
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  placeholder="Fecha (opcional, p. ej. Sábado 12 de septiembre de 2026)"
                  maxLength={60}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                <input
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  placeholder="Hora (opcional, p. ej. 5:00 pm)"
                  maxLength={40}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Lugar (opcional)"
                  maxLength={100}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                <input
                  value={rsvp}
                  onChange={(e) => setRsvp(e.target.value)}
                  placeholder="Confirmar asistencia al (opcional)"
                  maxLength={60}
                  className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
                />
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-teja/20 bg-teja/5 p-3 text-sm text-tinta/75">
                  <input
                    type="checkbox"
                    checked={automaticRsvp}
                    onChange={(e) => setAutomaticRsvp(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#c95a19]"
                  />
                  <span>
                    <strong className="block text-tinta">Confirmación automática RSVP</strong>
                    Tus invitados responderán desde la invitación y verás la lista en tu panel.
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-vino/20 bg-vino/5 p-3 text-sm text-tinta/75">
                  <input
                    type="checkbox"
                    checked={interactive}
                    onChange={(e) => setInteractive(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#6b2737]"
                  />
                  <span>
                    <strong className="block text-tinta">Invitación web interactiva</strong>
                    Crea una página para celular con sobre lacrado, contador, ubicación, vestimenta, cronología y buenos deseos.
                  </span>
                </label>
                {interactive && (
                  <div className="grid gap-3 rounded-xl border border-vino/15 bg-white/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-vino">Detalles de la experiencia</p>
                    <div>
                      <p className="text-xs text-tinta/65">Plantilla de la invitación web</p>
                      <div className="mt-1.5 max-h-64 overflow-y-auto rounded-lg border border-tinta/15 bg-white/70 p-2">
                        <SelectorPlantilla valor={plantillaId} onChange={setPlantillaId} />
                      </div>
                    </div>

                    {/* Fotos de los dueños del evento. Cuando se reparte la
                        invitación el álbum está vacío, así que sin esto la
                        portada salía con el diseño de la plantilla. */}
                    <div className="rounded-lg border border-tinta/15 bg-arena/40 p-3">
                      <p className="text-xs font-semibold text-tinta">Fotos de los novios o del homenajeado</p>
                      <p className="mt-0.5 text-xs text-tinta/55">Van solo en la invitación: no aparecen en el álbum de los invitados.</p>

                      <div className="mt-3 flex items-center gap-3">
                        {coverPhoto ? (
                          <img src={coverPhoto} alt="" className="h-16 w-12 rounded object-cover shadow-soft" />
                        ) : (
                          <span className="flex h-16 w-12 items-center justify-center rounded border border-dashed border-tinta/25 text-tinta/30"><ImagePlus size={16} /></span>
                        )}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-tinta">Foto de portada</p>
                          <div className="mt-1 flex gap-2">
                            <label className="cursor-pointer rounded-md border border-tinta/20 bg-white px-2.5 py-1 text-xs font-semibold text-tinta hover:bg-arena">
                              {subiendoFoto === "portada" ? "Subiendo…" : coverPhoto ? "Cambiar" : "Elegir foto"}
                              <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={subiendoFoto !== null}
                                onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subirFoto(f, "portada"); }} />
                            </label>
                            {coverPhoto && (
                              <button onClick={() => setCoverPhoto("")} className="rounded-md px-2 py-1 text-xs text-tinta/60 underline">Quitar</button>
                            )}
                          </div>
                        </div>
                      </div>

                      <p className="mt-4 text-xs font-medium text-tinta">Galería de la invitación</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {galleryPhotos.map((foto) => (
                          <span key={foto} className="relative">
                            <img src={foto} alt="" className="h-14 w-11 rounded object-cover shadow-soft" />
                            <button
                              onClick={() => setGalleryPhotos((fotos) => fotos.filter((f) => f !== foto))}
                              aria-label="Quitar esta foto"
                              className="absolute -right-1.5 -top-1.5 rounded-full bg-white p-0.5 text-tinta/60 shadow-soft"
                            >
                              <Trash2 size={11} />
                            </button>
                          </span>
                        ))}
                        {galleryPhotos.length < MAX_INVITATION_PHOTOS && (
                          <label className="flex h-14 w-11 cursor-pointer items-center justify-center rounded border border-dashed border-tinta/25 text-tinta/40 hover:bg-white">
                            {subiendoFoto === "galeria" ? <span className="text-[9px]">…</span> : <ImagePlus size={14} />}
                            <input type="file" accept="image/*,.heic,.heif" className="hidden" disabled={subiendoFoto !== null}
                              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) subirFoto(f, "galeria"); }} />
                          </label>
                        )}
                      </div>
                      {errorFoto && <p className="mt-2 text-xs text-vino">{errorFoto}</p>}
                    </div>
                    <label className="text-xs text-tinta/65">Inicio del evento
                      <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    </label>
                    <input value={mapUrl} onChange={(e) => setMapUrl(e.target.value)} placeholder="Enlace de Google Maps (opcional)" maxLength={500} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    <input value={dressCode} onChange={(e) => setDressCode(e.target.value)} placeholder="Código de vestimenta (p. ej. Formal · tonos tierra)" maxLength={160} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    <label className="text-xs text-tinta/65">Menciones: padres, padrinos… (una por línea, «Rol: Nombre»)
                      <textarea value={padrinos} onChange={(e) => setPadrinos(e.target.value)} placeholder={"Padres: Ana y Luis\nPadrinos de honor: Marta y Jorge"} maxLength={600} rows={3} className="mt-1 block w-full resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>

                    <div className="grid gap-2 rounded-lg border border-tinta/15 bg-arena/40 p-3">
                      <p className="text-xs font-semibold text-tinta">Ceremonia</p>
                      <textarea value={ceremonia} onChange={(e) => setCeremonia(e.target.value)} placeholder={"Parroquia de San Francisco\nCalle Mayor 12, Madrid"} maxLength={300} rows={2} className="resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={ceremoniaHora} onChange={(e) => setCeremoniaHora(e.target.value)} placeholder="Hora" maxLength={40} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                        <input value={ceremoniaMapa} onChange={(e) => setCeremoniaMapa(e.target.value)} placeholder="Enlace de mapa" maxLength={500} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                      </div>
                      <p className="mt-1 text-xs font-semibold text-tinta">Recepción</p>
                      <textarea value={recepcion} onChange={(e) => setRecepcion(e.target.value)} placeholder={"Hacienda El Roble\nCarretera del Lago km 4"} maxLength={300} rows={2} className="resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                      <div className="grid grid-cols-2 gap-2">
                        <input value={recepcionHora} onChange={(e) => setRecepcionHora(e.target.value)} placeholder="Hora" maxLength={40} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                        <input value={recepcionMapa} onChange={(e) => setRecepcionMapa(e.target.value)} placeholder="Enlace de mapa" maxLength={500} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                      </div>
                      <p className="text-xs text-tinta/55">Si lo dejas en blanco se enseña solo el lugar de arriba.</p>
                    </div>

                    <textarea value={timeline} onChange={(e) => setTimeline(e.target.value)} placeholder={"Cronología (una actividad por línea)\n5:00 pm · Ceremonia\n6:30 pm · Recepción"} maxLength={700} rows={4} className="resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    <input value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} placeholder="Enlace directo de música MP3 (opcional)" maxLength={500} className="rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    <label className="text-xs text-tinta/65">Iniciales del lacre del sobre
                      <input value={sealInitials} onChange={(e) => setSealInitials(e.target.value)} placeholder="p. ej. A&L" maxLength={4} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="text-xs text-tinta/65">Paleta de la vestimenta, separada por comas
                      <input value={palette} onChange={(e) => setPalette(e.target.value)} placeholder="beige, vino, dorado" maxLength={200} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="text-xs text-tinta/65">Colores a evitar, separados por comas
                      <input value={avoidColors} onChange={(e) => setAvoidColors(e.target.value)} placeholder="blanco, rojo" maxLength={200} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={"A tomar en cuenta (un aviso por línea)\nSolo adultos\nHay estacionamiento en el lugar"} maxLength={700} rows={3} className="resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm outline-none focus:border-teja" />
                    <label className="text-xs text-tinta/65">Hashtag del evento (opcional)
                      <input value={hashtag} onChange={(e) => setHashtag(e.target.value)} placeholder="BodaAnaYLuis" maxLength={60} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="text-xs text-tinta/65">Mesa de regalos (enlace)
                      <input value={mesaRegalos} onChange={(e) => setMesaRegalos(e.target.value)} placeholder="https://…" maxLength={500} className="mt-1 block w-full rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="text-xs text-tinta/65">Datos para transferencia (sale con botón de copiar)
                      <textarea value={datosBanco} onChange={(e) => setDatosBanco(e.target.value)} placeholder={"Banco Ejemplo\nCLABE 0123 4567 8901 2345 67\nA nombre de Ana Pérez"} maxLength={400} rows={3} className="mt-1 block w-full resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="text-xs text-tinta/65">Hospedaje sugerido (uno por línea)
                      <textarea value={hospedaje} onChange={(e) => setHospedaje(e.target.value)} placeholder={"Hotel Plaza · 10% con el código BODA\nPosada del Lago · a 5 min del salón"} maxLength={500} rows={2} className="mt-1 block w-full resize-y rounded-lg border border-tinta/20 bg-white px-3 py-2 text-sm text-tinta outline-none focus:border-teja" />
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-tinta/70">
                      <input type="checkbox" checked={pedirCanciones} onChange={(e) => setPedirCanciones(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6b2737]" />
                      <span><strong className="block text-tinta">Pedir canciones</strong>Los invitados sugieren qué quieren bailar; las verás en el muro del álbum.</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-tinta/70">
                      <input type="checkbox" checked={showGallery} onChange={(e) => setShowGallery(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6b2737]" />
                      <span><strong className="block text-tinta">Mostrar fotos del álbum</strong>Las últimas fotos subidas aparecen dentro de la invitación.</span>
                    </label>
                    <label className="flex cursor-pointer items-start gap-2 text-xs text-tinta/70">
                      <input type="checkbox" checked={collectWishes} onChange={(e) => setCollectWishes(e.target.checked)} className="mt-0.5 h-4 w-4 accent-[#6b2737]" />
                      <span><strong className="block text-tinta">Pedir buenos deseos</strong>Se guardan en el muro de mensajes y se imprimen en el libro de recuerdos.</span>
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-4 rounded-xl border border-tinta/15 bg-white/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                    Texto
                  </p>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => setSelected("text")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        editing === "text"
                          ? "bg-tinta text-white"
                          : "bg-arena text-tinta/70 hover:bg-tinta/10"
                      }`}
                    >
                      Título
                    </button>
                    <button
                      onClick={() => setSelected("detalles")}
                      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                        editing === "detalles"
                          ? "bg-tinta text-white"
                          : "bg-arena text-tinta/70 hover:bg-tinta/10"
                      }`}
                    >
                      Fecha y datos
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-tinta/50">
                  {editing === "text"
                    ? "Cambia el título; puedes arrastrarlo por la invitación."
                    : "Fecha, hora, lugar y confirmación se mueven aparte del título."}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FONT_CHOICES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setEditingLayout((l) => ({ ...l, fontFamily: f.family }))}
                      style={{ fontFamily: f.family }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        editingLayout.fontFamily === f.family
                          ? "border-teja bg-teja/10 font-semibold text-teja"
                          : "border-tinta/20 text-tinta/70"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-tinta/50">Tamaño</span>
                  <input
                    type="range"
                    min={editing === "text" ? 20 : 12}
                    max={editing === "text" ? 90 : 48}
                    value={editingLayout.fontSize}
                    onChange={(e) =>
                      setEditingLayout((l) =>
                        clampTextLayout(
                          { ...l, fontSize: Number(e.target.value) },
                          template.canvasW,
                          template.canvasH,
                        ),
                      )
                    }
                    className="flex-1"
                  />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  {COLOR_SWATCHES.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditingLayout((l) => ({ ...l, color: c }))}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-full border-2 ${
                        editingLayout.color === c ? "border-teja" : "border-white/70"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={editingLayout.color}
                    onChange={(e) => setEditingLayout((l) => ({ ...l, color: e.target.value }))}
                    className="h-6 w-6 cursor-pointer rounded-full border-0 bg-transparent p-0"
                  />
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between rounded-xl border border-tinta/15 bg-white/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                  Tamaño del QR
                </p>
                <input
                  type="range"
                  min={70}
                  max={280}
                  value={qrLayout.size}
                  onChange={(e) => {
                    const newSize = Number(e.target.value);
                    setQrLayout((l) => {
                      // Ancla el borde inferior: al agrandar, el QR crece hacia
                      // arriba (donde suele haber más espacio libre) en vez de
                      // hundirse en el texto o la decoración que tiene debajo.
                      const bottom = l.y + l.size / 2;
                      return clampQrLayout(
                        { ...l, size: newSize, y: bottom - newSize / 2 },
                        template.canvasW,
                        template.canvasH,
                      );
                    });
                  }}
                  className="w-32"
                />
              </div>

              <div className="mt-3 rounded-xl border border-tinta/15 bg-white/60 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                    Foto adicional
                  </p>
                  {photoImg && (
                    <button
                      onClick={() => {
                        setPhotoImg(null);
                        setPhotoLayout(null);
                        setSelected(null);
                      }}
                      className="text-xs text-teja underline"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {photoImg && photoLayout ? (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-tinta/50">Tamaño</span>
                      <input
                        type="range"
                        min={60}
                        max={340}
                        value={photoLayout.size}
                        onChange={(e) =>
                          setPhotoLayout(
                            (l) =>
                              l &&
                              clampPhotoLayout(
                                { ...l, size: Number(e.target.value) },
                                template.canvasW,
                                template.canvasH,
                              ),
                          )
                        }
                        className="flex-1"
                      />
                    </div>
                    <div className="flex gap-1.5">
                      {(["circle", "square"] as const).map((shape) => (
                        <button
                          key={shape}
                          onClick={() => setPhotoLayout((l) => l && { ...l, shape })}
                          className={`rounded-full border px-3 py-1 text-xs transition ${
                            photoLayout.shape === shape
                              ? "border-teja bg-teja/10 font-semibold text-teja"
                              : "border-tinta/20 text-tinta/70"
                          }`}
                        >
                          {shape === "circle" ? "Redonda" : "Cuadrada"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <label className="mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-tinta/30 py-2 text-xs text-tinta/60 transition hover:bg-white">
                    <ImagePlus size={14} /> Añadir una foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
                  </label>
                )}
              </div>

              <div className="mt-3 rounded-xl border border-tinta/15 bg-white/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                  QR de la invitación
                </p>
                <p className="mt-1 text-xs text-tinta/60">
                  Un código distinto al de las fotos: al escanearlo se abre esta invitación en el
                  celular (no el álbum).
                </p>
                {puedeGuardar ? (
                  <>
                    <p className="mt-1 text-xs text-tinta/60">
                      Al guardarla, el enlace y el QR quedan fijos: puedes volver aquí, cambiar la
                      fecha o las fotos y guardar otra vez sin repartir nada nuevo.
                    </p>
                    <button
                      onClick={guardarInvitacion}
                      disabled={guardando || !ready}
                      className="shimmer mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-teja py-2 text-sm font-semibold text-white transition hover:bg-teja-oscuro disabled:opacity-50"
                    >
                      <Save size={14} /> {guardando ? "Guardando…" : guardado ? "Guardar los cambios" : "Guardar invitación"}
                    </button>
                    {errorGuardar && <p className="mt-2 text-xs text-vino">{errorGuardar}</p>}
                    {enlaceGuardado && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-teja-oscuro">
                          Guardada. Este es su enlace:
                        </p>
                        <div className="mt-1 flex gap-1.5">
                          <input
                            readOnly
                            value={enlaceGuardado}
                            onFocus={(e) => e.currentTarget.select()}
                            className="min-w-0 flex-1 rounded-lg border border-tinta/20 bg-white px-2 py-1.5 text-xs text-tinta"
                          />
                          <button
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(enlaceGuardado);
                                setEnlaceCopiado(true);
                                window.setTimeout(() => setEnlaceCopiado(false), 2000);
                              } catch {
                                // Sin portapapeles el enlace se ve igual y se puede copiar a mano.
                              }
                            }}
                            className="shrink-0 rounded-lg border border-tinta/20 bg-white px-2.5 text-xs font-semibold text-tinta hover:bg-arena"
                          >
                            {enlaceCopiado ? "¡Copiado!" : "Copiar"}
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <button
                    onClick={handleGenerateInvitationLink}
                    disabled={generatingLink || !ready}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-tinta/20 bg-white py-2 text-sm font-semibold text-tinta transition hover:bg-arena disabled:opacity-50"
                  >
                    <QrCode size={14} /> {generatingLink ? "Generando…" : "Generar QR de la invitación"}
                  </button>
                )}
                {invitationLinkQr && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    <img src={invitationLinkQr} alt="QR de la invitación" className="h-32 w-32" />
                    <a
                      href={invitationLinkQr}
                      download="qr-invitacion.png"
                      className="text-xs font-semibold text-teja underline"
                    >
                      Descargar este QR
                    </a>
                  </div>
                )}
              </div>

              <button
                onClick={handleDownload}
                disabled={!ready}
                className="shimmer mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro disabled:opacity-50"
              >
                <Download size={16} /> Descargar invitación
              </button>
              <p className="mt-2 text-center text-xs text-tinta/50 sm:text-left">
                Lista para mandar por WhatsApp o imprimir.
              </p>
            </div>

            <div className="order-1 flex min-h-0 flex-col items-center justify-start md:order-2 md:justify-center">
              {/* Con la experiencia interactiva activada hay dos cosas que
                  mirar: la imagen que se descarga y la página web. Sin esta
                  vista previa había que rellenar los campos a ciegas. */}
              {interactive && (
                <div className="mb-2 flex items-center gap-1.5 rounded-full bg-white/70 p-1">
                  <button
                    onClick={() => setVista("imagen")}
                    className={`rounded-full px-3 py-1 text-xs font-semibold transition ${vista === "imagen" ? "bg-tinta text-white" : "text-tinta/70"}`}
                  >
                    Imagen
                  </button>
                  <button
                    onClick={() => { setVista("web"); refrescarVista(); }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${vista === "web" ? "bg-tinta text-white" : "text-tinta/70"}`}
                  >
                    <Smartphone size={12} /> Invitación web
                  </button>
                </div>
              )}

              {interactive && vista === "web" ? (
                <>
                  <div className="overflow-hidden rounded-[2rem] border-4 border-tinta/80 bg-white shadow-lift">
                    <iframe
                      key={urlVista ?? "vacia"}
                      src={urlVista ?? undefined}
                      title="Vista previa de la invitación web"
                      className="block h-[58vh] w-[280px] border-0"
                    />
                  </div>
                  <button onClick={refrescarVista} className="mt-2 rounded-full border border-tinta/20 bg-white px-4 py-1.5 text-xs font-semibold text-tinta hover:bg-arena">
                    Actualizar vista previa
                  </button>
                  <p className="mt-1 text-center text-xs text-tinta/50">
                    Se abre ya sin el sobre, para que veas el interior mientras editas.
                  </p>
                </>
              ) : (
              <>
              <p className="mb-2 text-center text-xs text-tinta/50">
                Arrastra el texto, el código QR o la foto para moverlos
              </p>
              {!ready && (
                <div
                  className="flex max-h-[34vh] items-center justify-center rounded-xl bg-white/40 text-sm text-tinta/50 md:max-h-[64vh]"
                  style={{ aspectRatio: `${template.canvasW} / ${template.canvasH}`, height: "34vh" }}
                >
                  Cargando…
                </div>
              )}
              <canvas
                ref={canvasRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                className={`max-h-[34vh] w-auto touch-none rounded-xl object-contain shadow-lift md:max-h-[64vh] ${
                  ready ? "" : "hidden"
                }`}
              />
              </>
              )}
            </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
