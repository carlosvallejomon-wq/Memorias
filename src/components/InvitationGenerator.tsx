"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PartyPopper, X, Download, ImagePlus, QrCode } from "lucide-react";

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

export type TextLayout = {
  x: number;
  y: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  maxWidth: number;
};

export type QrLayout = { x: number; y: number; size: number };
type PhotoLayout = { x: number; y: number; size: number; shape: "circle" | "square" };
type SelectedKey = "text" | "qr" | "photo" | null;

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

let fontsReady: Promise<void> | null = null;
export function ensureInvitationFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      await loadStylesheet(
        "mv-invite-fonts",
        "https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Poppins:ital,wght@0,600;0,700;0,800;1,500&family=Playfair+Display:ital,wght@0,700;1,400&display=swap",
      );
      try {
        await Promise.all([
          document.fonts.load('120px "Pinyon Script"'),
          document.fonts.load('800 40px "Poppins"'),
          document.fonts.load('600 24px "Poppins"'),
          document.fonts.load('italic 500 20px "Poppins"'),
          document.fonts.load('700 40px "Playfair Display"'),
          document.fonts.load('italic 400 20px "Playfair Display"'),
        ]);
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
  return { x: l.x, y: l.y + l.fontSize * 1.6, w: l.maxWidth + 30, h: l.fontSize * 5.2 };
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

function drawTextBlock(ctx: CanvasRenderingContext2D, l: TextLayout, data: InvitationData) {
  ctx.textAlign = "center";
  ctx.fillStyle = l.color;
  ctx.font = nameFont(data.albumName, l.fontSize, nameWeightFor(l.fontFamily), l.fontFamily);
  let y = wrapText(ctx, data.albumName, l.x, l.y, l.maxWidth, l.fontSize * 1.12);

  const host = hostLine(data);
  if (host) {
    y += l.fontSize * 0.55;
    ctx.font = `italic ${Math.round(l.fontSize * 0.55)}px ${l.fontFamily}`;
    ctx.globalAlpha = 0.85;
    ctx.fillText(host, l.x, y);
    ctx.globalAlpha = 1;
  }

  y += l.fontSize * 0.6;
  ctx.font = `${Math.round(l.fontSize * 0.5)}px ${l.fontFamily}`;
  ctx.globalAlpha = 0.85;
  const lines = data.rsvp
    ? [...detailLines(data), `Confirma tu asistencia: ${data.rsvp}`]
    : detailLines(data);
  for (const line of lines) {
    ctx.fillText(line, l.x, y);
    y += l.fontSize * 0.68;
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
  qrLayout: QrLayout,
  photoLayout: PhotoLayout | null,
) {
  let b: { x: number; y: number; w: number; h: number } | null = null;
  if (selected === "text") b = textBounds(textLayout);
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
  drawTextBlock(ctx, textLayout, data);
  if (qrImg) drawQrBlock(ctx, qrLayout, qrImg, textLayout.color);
  if (selected) drawSelectionOutline(ctx, selected, textLayout, qrLayout, photoLayout);
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
];

// --- Enlace compartible de la invitación (para un QR aparte del de fotos) --
// Guarda el diseño completo (plantilla, textos y posiciones) en la propia
// URL, sin necesitar guardar nada en el servidor: la página /invitacion lo
// vuelve a dibujar con estos mismos datos.

export type InvitationLinkState = {
  t: string;
  n: string;
  d?: string;
  h?: string;
  l?: string;
  o?: string;
  r?: string;
  u: string;
  tx: TextLayout;
  q: QrLayout;
};

export function encodeInvitationLink(state: InvitationLinkState): string {
  return encodeURIComponent(JSON.stringify(state));
}

export function decodeInvitationLink(raw: string): InvitationLinkState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (
      !parsed ||
      typeof parsed !== "object" ||
      typeof parsed.t !== "string" ||
      typeof parsed.n !== "string" ||
      typeof parsed.u !== "string" ||
      !parsed.tx ||
      !parsed.q
    ) {
      return null;
    }
    return parsed as InvitationLinkState;
  } catch {
    return null;
  }
}

// --- Componente ---------------------------------------------------------

export function InvitationGenerator({
  albumName,
  eventDateLabel,
  shareUrl,
}: {
  albumName: string;
  eventDateLabel: string | null;
  shareUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [date, setDate] = useState(eventDateLabel ?? "");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [hosts, setHosts] = useState("");
  const [rsvp, setRsvp] = useState("");

  const template = TEMPLATES.find((t) => t.id === templateId) ?? TEMPLATES[0];
  const data: InvitationData = {
    albumName,
    eventDateLabel: date.trim() || null,
    time,
    location,
    hosts,
    rsvp,
    shareUrl,
  };

  const [textLayout, setTextLayout] = useState<TextLayout>(() => ({ ...TEMPLATES[0].defaultText }));
  const [qrLayout, setQrLayout] = useState<QrLayout>(() => ({ ...TEMPLATES[0].defaultQr }));
  const [photoLayout, setPhotoLayout] = useState<PhotoLayout | null>(null);
  const [photoImg, setPhotoImg] = useState<HTMLImageElement | null>(null);
  const [selected, setSelected] = useState<SelectedKey>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [invitationLinkQr, setInvitationLinkQr] = useState<string | null>(null);
  const [generatingLink, setGeneratingLink] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragRef = useRef<{ key: "text" | "qr" | "photo"; offX: number; offY: number } | null>(null);

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
    setTextLayout({ ...template.defaultText });
    setQrLayout({ ...template.defaultQr });
    setPhotoLayout(null);
    setPhotoImg(null);
    setSelected(null);
    setBgImg(null);
    setInvitationLinkQr(null);
    if (template.bgImage) {
      let cancelled = false;
      loadImage(template.bgImage).then((img) => {
        if (!cancelled) setBgImg(img);
      });
      return () => {
        cancelled = true;
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const ready = fontsLoaded && !!qrImg && (!template.bgImage || !!bgImg);

  useEffect(() => {
    if (!ready) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = template.canvasW;
    canvas.height = template.canvasH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    renderInvitation(ctx, template, data, textLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, selected);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    ready,
    template,
    textLayout,
    qrLayout,
    photoLayout,
    bgImg,
    qrImg,
    photoImg,
    selected,
    albumName,
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
    let hit: "text" | "qr" | "photo" | null = null;
    let anchor = { x: 0, y: 0 };
    if (photoLayout && inBounds(p, photoBounds(photoLayout))) {
      hit = "photo";
      anchor = photoLayout;
    } else if (inBounds(p, qrBounds(qrLayout))) {
      hit = "qr";
      anchor = qrLayout;
    } else if (inBounds(p, textBounds(textLayout))) {
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
    renderInvitation(ctx, template, data, textLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, null);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = "invitacion.png";
    a.click();
    renderInvitation(ctx, template, data, textLayout, qrLayout, photoLayout, bgImg, qrImg, photoImg, selected);
  }

  async function handleGenerateInvitationLink() {
    setGeneratingLink(true);
    try {
      const state: InvitationLinkState = {
        t: templateId,
        n: albumName,
        d: date.trim() || undefined,
        h: time.trim() || undefined,
        l: location.trim() || undefined,
        o: hosts.trim() || undefined,
        r: rsvp.trim() || undefined,
        u: shareUrl,
        tx: textLayout,
        q: qrLayout,
      };
      const url = `${window.location.origin}/invitacion?d=${encodeInvitationLink(state)}`;
      const qrDataUrl = await QRCode.toDataURL(url, { margin: 1, width: 480 });
      setInvitationLinkQr(qrDataUrl);
    } finally {
      setGeneratingLink(false);
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
      >
        <PartyPopper size={16} /> Invitación
      </button>

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass grid max-h-full w-full max-w-3xl grid-cols-1 gap-5 overflow-y-auto rounded-2xl p-5 sm:grid-cols-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-semibold">
                  <PartyPopper size={18} className="text-teja" /> Invitación
                </h2>
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-full bg-white/70 p-1.5 transition hover:bg-white sm:hidden"
                >
                  <X size={16} />
                </button>
              </div>

              <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-tinta/50">
                Plantilla
              </p>
              <div className="mt-2 grid grid-cols-4 gap-2">
                {TEMPLATES.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTemplateId(t.id)}
                    title={t.label}
                    className={`aspect-[5/7] overflow-hidden rounded-lg shadow-soft transition ${
                      t.swatch ? `bg-gradient-to-br ${t.swatch}` : ""
                    } ${templateId === t.id ? "ring-2 ring-teja ring-offset-2" : "opacity-70"}`}
                  >
                    {t.bgImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.bgImage} alt={t.label} className="h-full w-full object-cover" />
                    )}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-xs text-tinta/50">
                {TEMPLATES.find((t) => t.id === templateId)?.label}
              </p>

              <div className="mt-4 flex flex-col gap-3">
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
              </div>

              <div className="mt-4 rounded-xl border border-tinta/15 bg-white/60 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">Texto</p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {FONT_CHOICES.map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setTextLayout((l) => ({ ...l, fontFamily: f.family }))}
                      style={{ fontFamily: f.family }}
                      className={`rounded-full border px-3 py-1 text-xs transition ${
                        textLayout.fontFamily === f.family
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
                    min={20}
                    max={90}
                    value={textLayout.fontSize}
                    onChange={(e) =>
                      setTextLayout((l) =>
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
                      onClick={() => setTextLayout((l) => ({ ...l, color: c }))}
                      style={{ backgroundColor: c }}
                      className={`h-6 w-6 rounded-full border-2 ${
                        textLayout.color === c ? "border-teja" : "border-white/70"
                      }`}
                    />
                  ))}
                  <input
                    type="color"
                    value={textLayout.color}
                    onChange={(e) => setTextLayout((l) => ({ ...l, color: e.target.value }))}
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
                <button
                  onClick={handleGenerateInvitationLink}
                  disabled={generatingLink || !ready}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg border border-tinta/20 bg-white py-2 text-sm font-semibold text-tinta transition hover:bg-arena disabled:opacity-50"
                >
                  <QrCode size={14} /> {generatingLink ? "Generando…" : "Generar QR de la invitación"}
                </button>
                {invitationLinkQr && (
                  <div className="mt-3 flex flex-col items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
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

            <div className="relative flex flex-col items-center justify-center">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-0 top-0 hidden rounded-full bg-white/70 p-1.5 transition hover:bg-white sm:block"
              >
                <X size={16} />
              </button>
              <p className="mb-2 text-center text-xs text-tinta/50">
                Arrastra el texto, el código QR o la foto para moverlos
              </p>
              {!ready && (
                <div
                  className="flex w-full items-center justify-center rounded-xl bg-white/40 text-sm text-tinta/50"
                  style={{ aspectRatio: `${template.canvasW} / ${template.canvasH}` }}
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
                className={`w-full touch-none rounded-xl shadow-lift ${ready ? "" : "hidden"}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
