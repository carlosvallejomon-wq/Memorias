"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { PartyPopper, X, Download } from "lucide-react";

const CANVAS_W = 1000;
const CANVAS_H = 1400;
const QR_SIZE = 380;

type InvitationData = {
  albumName: string;
  eventDateLabel: string | null;
  time: string;
  location: string;
  hosts: string;
  rsvp: string;
  shareUrl: string;
};

type Template = {
  id: string;
  label: string;
  swatch: string;
  // Plantillas con diseño real (imagen de fondo incrustada tal cual, no
  // recreada): traen su propio tamaño de lienzo (el de la imagen, para no
  // recortar nada) y una miniatura real en vez de un degradado.
  bgImage?: string;
  canvasW?: number;
  canvasH?: number;
  draw: (
    ctx: CanvasRenderingContext2D,
    data: InvitationData,
    qrImage: HTMLImageElement,
    bgImage: HTMLImageElement | null,
  ) => void;
};

// --- Utilidades de dibujo compartidas -------------------------------------

function loadImage(src: string): Promise<HTMLImageElement> {
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
function ensureInvitationFonts(): Promise<void> {
  if (!fontsReady) {
    fontsReady = (async () => {
      await loadStylesheet(
        "mv-invite-fonts",
        "https://fonts.googleapis.com/css2?family=Pinyon+Script&family=Poppins:wght@600;700;800&display=swap",
      );
      try {
        await Promise.all([
          document.fonts.load('120px "Pinyon Script"'),
          document.fonts.load('800 40px "Poppins"'),
          document.fonts.load('600 24px "Poppins"'),
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

function drawQrCard(
  ctx: CanvasRenderingContext2D,
  qrImage: HTMLImageElement,
  y: number,
  borderColor: string,
) {
  const x = (CANVAS_W - QR_SIZE) / 2;
  ctx.fillStyle = "#ffffff";
  roundRectPath(ctx, x - 20, y - 20, QR_SIZE + 40, QR_SIZE + 40, 18);
  ctx.fill();
  ctx.strokeStyle = borderColor;
  ctx.lineWidth = 2;
  roundRectPath(ctx, x - 20, y - 20, QR_SIZE + 40, QR_SIZE + 40, 18);
  ctx.stroke();
  ctx.drawImage(qrImage, x, y, QR_SIZE, QR_SIZE);
  return y + QR_SIZE + 40;
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

// Tarjeta redondeada semitransparente para asentar los datos reales del
// álbum encima de un diseño real (imagen de fondo), sin depender de que
// haya un hueco perfectamente en blanco detrás.
function drawCard(
  ctx: CanvasRenderingContext2D,
  cx: number,
  top: number,
  w: number,
  h: number,
  fill: string,
  border: string,
) {
  const x = cx - w / 2;
  ctx.fillStyle = fill;
  roundRectPath(ctx, x, top, w, h, 22);
  ctx.fill();
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, x, top, w, h, 22);
  ctx.stroke();
}

// --- Plantillas -------------------------------------------------------------

const TEMPLATES: Template[] = [
  {
    id: "clasico",
    label: "Clásico cálido",
    swatch: "from-oro to-teja",
    draw: (ctx, data, qrImage) => {
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

      ctx.fillStyle = "#2b2118";
      ctx.font = nameFont(data.albumName, 62, "700", "Georgia, serif");
      let y = wrapText(ctx, data.albumName, CANVAS_W / 2, 340, CANVAS_W - 220, 68);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "italic 22px Georgia, serif";
        ctx.fillStyle = "#6b2737";
        ctx.fillText(host, CANVAS_W / 2, y);
      }

      y += 30;
      ctx.font = "27px Georgia, serif";
      ctx.fillStyle = "#2b2118";
      ctx.globalAlpha = 0.75;
      for (const line of detailLines(data)) {
        ctx.fillText(line, CANVAS_W / 2, y);
        y += 38;
      }
      ctx.globalAlpha = 1;

      y += 20;
      ctx.strokeStyle = "#c2571b";
      ctx.globalAlpha = 0.5;
      ctx.beginPath();
      ctx.moveTo(260, y);
      ctx.lineTo(460, y);
      ctx.moveTo(540, y);
      ctx.lineTo(740, y);
      ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#c2571b";
      ctx.save();
      ctx.translate(CANVAS_W / 2, y);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-7, -7, 14, 14);
      ctx.restore();

      const afterQr = drawQrCard(ctx, qrImage, y + 50, "#efe6d8");

      ctx.fillStyle = "#2b2118";
      ctx.globalAlpha = 0.75;
      ctx.font = "25px Georgia, serif";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", CANVAS_W / 2, afterQr + 45);
      if (data.rsvp) {
        ctx.font = "21px Georgia, serif";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, CANVAS_W / 2, afterQr + 80);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "floral",
    label: "Floral elegante",
    swatch: "from-vino to-oro",
    draw: (ctx, data, qrImage) => {
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

      ctx.fillStyle = "#7c2d92";
      ctx.font = nameFont(data.albumName, 108, "", '"Pinyon Script", cursive');
      let y = wrapText(ctx, data.albumName, CANVAS_W / 2, 400, CANVAS_W - 180, 110);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 24px Georgia, serif";
        ctx.fillStyle = "#7c3aed";
        ctx.fillText(host, CANVAS_W / 2, y);
      }

      y += 10;
      ctx.font = "26px Georgia, serif";
      ctx.fillStyle = "#4c1d63";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, CANVAS_W / 2, y);
        y += 36;
      }
      ctx.globalAlpha = 1;

      const afterQr = drawQrCard(ctx, qrImage, y + 50, "#c9a8e0");

      ctx.fillStyle = "#4c1d63";
      ctx.globalAlpha = 0.8;
      ctx.font = "24px Georgia, serif";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", CANVAS_W / 2, afterQr + 45);
      if (data.rsvp) {
        ctx.font = "21px Georgia, serif";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, CANVAS_W / 2, afterQr + 80);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "geometrico",
    label: "Geométrico dorado",
    swatch: "from-tinta to-teja-oscuro",
    draw: (ctx, data, qrImage) => {
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

      ctx.fillStyle = "#ffffff";
      ctx.font = nameFont(data.albumName, 68, "800", '"Poppins", sans-serif');
      let y = wrapText(ctx, data.albumName, CANVAS_W / 2, 350, CANVAS_W - 200, 78);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "500 22px Poppins, sans-serif";
        ctx.fillStyle = "#c9a227";
        ctx.fillText(host, CANVAS_W / 2, y);
      }

      y += 30;
      ctx.font = "600 26px Poppins, sans-serif";
      ctx.fillStyle = "#f3e4d2";
      ctx.globalAlpha = 0.9;
      for (const line of detailLines(data)) {
        ctx.fillText(line, CANVAS_W / 2, y);
        y += 38;
      }
      ctx.globalAlpha = 1;

      y += 15;
      ctx.strokeStyle = "#c9a227";
      ctx.beginPath();
      ctx.moveTo(CANVAS_W / 2 - 90, y);
      ctx.lineTo(CANVAS_W / 2 + 90, y);
      ctx.stroke();

      const afterQr = drawQrCard(ctx, qrImage, y + 50, "#c9a227");

      ctx.fillStyle = "#f3e4d2";
      ctx.globalAlpha = 0.85;
      ctx.font = "500 24px Poppins, sans-serif";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", CANVAS_W / 2, afterQr + 45);
      if (data.rsvp) {
        ctx.font = "400 20px Poppins, sans-serif";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, CANVAS_W / 2, afterQr + 80);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "infantil",
    label: "Fiesta infantil",
    swatch: "from-teja to-vino",
    draw: (ctx, data, qrImage) => {
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

      ctx.fillStyle = "#7c3aed";
      ctx.font = nameFont(data.albumName, 118, "", '"Pinyon Script", cursive');
      let y = wrapText(ctx, data.albumName, CANVAS_W / 2, 500, CANVAS_W - 180, 118);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "600 22px Poppins, sans-serif";
        ctx.fillStyle = "#db2777";
        ctx.fillText(host, CANVAS_W / 2, y);
      }

      y += 20;
      ctx.font = "700 27px Poppins, sans-serif";
      ctx.fillStyle = "#1f2937";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, CANVAS_W / 2, y);
        y += 38;
      }
      ctx.globalAlpha = 1;

      const afterQr = drawQrCard(ctx, qrImage, y + 50, "#f43f5e");

      ctx.fillStyle = "#1f2937";
      ctx.globalAlpha = 0.75;
      ctx.font = "500 23px Poppins, sans-serif";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", CANVAS_W / 2, afterQr + 45);
      if (data.rsvp) {
        ctx.font = "400 20px Poppins, sans-serif";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, CANVAS_W / 2, afterQr + 80);
      }
      ctx.globalAlpha = 1;
    },
  },
  {
    id: "quince-pastel",
    label: "Mis Quince (pastel)",
    swatch: "",
    bgImage: "/invitation-templates/quince-pastel.jpg",
    canvasW: 810,
    canvasH: 1440,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      drawCard(ctx, cx, 745, 640, 560, "rgba(255,255,255,0.93)", "#e9c9dc");

      ctx.textAlign = "center";
      let y = 810;
      ctx.fillStyle = "#7a4a63";
      ctx.font = nameFont(data.albumName, 36, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 560, 40);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 19px Georgia, serif";
        ctx.fillStyle = "#a4789a";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "20px Georgia, serif";
      ctx.fillStyle = "#4a3a42";
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 28;
      }

      y += 20;
      const qrSize = 150;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 30;

      ctx.font = "600 16px Georgia, serif";
      ctx.fillStyle = "#7a4a63";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 24;
        ctx.font = "14px Georgia, serif";
        ctx.fillStyle = "#8a6a7a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-purpura",
    label: "15 Años (morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-purpura.jpg",
    canvasW: 1071,
    canvasH: 1499,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 810;
      ctx.fillStyle = "#f0e0fa";
      ctx.font = nameFont(data.albumName, 46, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 52);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "italic 24px Georgia, serif";
        ctx.fillStyle = "#c9a8e0";
        ctx.fillText(host, cx, y);
      }

      y += 40;
      const qrSize = 160;
      drawCard(ctx, cx, y, qrSize + 60, qrSize + 60, "rgba(255,255,255,0.95)", "#c9a8e0");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 30, qrSize, qrSize);
      y += qrSize + 60 + 36;

      ctx.font = "22px Georgia, serif";
      ctx.fillStyle = "#e9d5f5";
      ctx.globalAlpha = 0.9;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 32;
      }
      ctx.globalAlpha = 1;

      y += 10;
      ctx.font = "600 18px Georgia, serif";
      ctx.fillStyle = "#f0e0fa";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 26;
        ctx.font = "16px Georgia, serif";
        ctx.fillStyle = "#c9a8e0";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-lavanda",
    label: "Mis Quince (lavanda)",
    swatch: "",
    bgImage: "/invitation-templates/quince-lavanda.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 750;
      ctx.fillStyle = "#3a2f52";
      ctx.font = nameFont(data.albumName, 42, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 48);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 22px Georgia, serif";
        ctx.fillStyle = "#6b5b8a";
        ctx.fillText(host, cx, y);
      }

      y += 34;
      ctx.font = "22px Georgia, serif";
      ctx.fillStyle = "#4a3f60";
      ctx.globalAlpha = 0.9;
      const lines = data.rsvp
        ? [...detailLines(data), `Confirma tu asistencia: ${data.rsvp}`]
        : detailLines(data);
      for (const line of lines) {
        ctx.fillText(line, cx, y);
        y += 32;
      }
      ctx.globalAlpha = 1;

      // Sustituye el "[ Código QR ]" de la plantilla por el QR real, justo
      // debajo del texto "Escanea el código QR..." ya impreso en el diseño
      // (que se deja intacto, sin taparlo).
      const qrSize = 120;
      const qrTop = 1335;
      const cardW = 260;
      ctx.fillStyle = "rgba(255,255,255,0.95)";
      roundRectPath(ctx, cx - cardW / 2, qrTop - 20, cardW, qrSize + 40, 18);
      ctx.fill();
      ctx.drawImage(qrImage, cx - qrSize / 2, qrTop, qrSize, qrSize);
    },
  },
  {
    id: "quince-botanico",
    label: "15 Años (botánico azul)",
    swatch: "",
    bgImage: "/invitation-templates/quince-botanico.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 890;
      ctx.fillStyle = "#16324f";
      ctx.font = nameFont(data.albumName, 46, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 780, 52);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "italic 24px Georgia, serif";
        ctx.fillStyle = "#c9922a";
        ctx.fillText(host, cx, y);
      }

      y += 36;
      ctx.font = "23px Georgia, serif";
      ctx.fillStyle = "#3a4a5a";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 33;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 150;
      drawCard(ctx, cx, y, qrSize + 50, qrSize + 50, "rgba(255,255,255,0.95)", "#16324f");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 25, qrSize, qrSize);
      y += qrSize + 50 + 40;

      ctx.font = "600 18px Georgia, serif";
      ctx.fillStyle = "#16324f";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 26;
        ctx.font = "16px Georgia, serif";
        ctx.fillStyle = "#c9922a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-sparkle",
    label: "15 Años (brillos)",
    swatch: "",
    bgImage: "/invitation-templates/quince-sparkle.jpg",
    canvasW: 1071,
    canvasH: 1499,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      drawCard(ctx, cx, 560, 780, 520, "rgba(20,16,20,0.4)", "rgba(255,255,255,0.25)");

      ctx.textAlign = "center";
      let y = 630;
      ctx.fillStyle = "#ffffff";
      ctx.font = nameFont(data.albumName, 44, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 700, 50);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "italic 23px Georgia, serif";
        ctx.fillStyle = "#f2c9d6";
        ctx.fillText(host, cx, y);
      }

      y += 34;
      ctx.font = "22px Georgia, serif";
      ctx.fillStyle = "#f4eef1";
      ctx.globalAlpha = 0.9;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 32;
      }
      ctx.globalAlpha = 1;

      y += 15;
      const qrSize = 130;
      ctx.fillStyle = "#ffffff";
      roundRectPath(ctx, cx - qrSize / 2 - 18, y, qrSize + 36, qrSize + 36, 16);
      ctx.fill();
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 18, qrSize, qrSize);
      y += qrSize + 36 + 34;

      ctx.font = "600 17px Georgia, serif";
      ctx.fillStyle = "#ffffff";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 24;
        ctx.font = "15px Georgia, serif";
        ctx.fillStyle = "#f2c9d6";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-negrodorado",
    label: "15 Años (negro y oro)",
    swatch: "",
    bgImage: "/invitation-templates/quince-negrodorado.jpg",
    canvasW: 1071,
    canvasH: 1499,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 460;
      ctx.fillStyle = "#d3a94e";
      ctx.font = nameFont(data.albumName, 46, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 780, 52);

      const host = hostLine(data);
      if (host) {
        y += 26;
        ctx.font = "italic 23px Georgia, serif";
        ctx.fillStyle = "#e9d5a8";
        ctx.fillText(host, cx, y);
      }

      y += 36;
      ctx.font = "22px Georgia, serif";
      ctx.fillStyle = "#e9d5a8";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 32;
      }
      ctx.globalAlpha = 1;

      y += 30;
      const qrSize = 150;
      drawCard(ctx, cx, y, qrSize + 50, qrSize + 50, "rgba(255,255,255,0.95)", "#d3a94e");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 25, qrSize, qrSize);
      y += qrSize + 50 + 40;

      ctx.font = "600 18px Georgia, serif";
      ctx.fillStyle = "#d3a94e";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 26;
        ctx.font = "16px Georgia, serif";
        ctx.fillStyle = "#e9d5a8";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-iris",
    label: "15 Años (iris morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-iris.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 640;
      ctx.fillStyle = "#3a2f52";
      ctx.font = nameFont(data.albumName, 42, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 48);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 22px Georgia, serif";
        ctx.fillStyle = "#6b5b8a";
        ctx.fillText(host, cx, y);
      }

      y += 34;
      ctx.font = "21px Georgia, serif";
      ctx.fillStyle = "#4a3f60";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 30;
      }
      ctx.globalAlpha = 1;

      y += 25;
      const qrSize = 140;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 30;

      ctx.font = "600 17px Georgia, serif";
      ctx.fillStyle = "#3a2f52";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 24;
        ctx.font = "15px Georgia, serif";
        ctx.fillStyle = "#6b5b8a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-ventana",
    label: "15 Años (bienvenidas beige)",
    swatch: "",
    bgImage: "/invitation-templates/quince-ventana.jpg",
    canvasW: 1080,
    canvasH: 1440,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 1010;
      ctx.fillStyle = "#4a4a44";
      ctx.font = nameFont(data.albumName, 38, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 780, 44);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 21px Georgia, serif";
        ctx.fillStyle = "#5b7fa6";
        ctx.fillText(host, cx, y);
      }

      y += 28;
      ctx.font = "19px Georgia, serif";
      ctx.fillStyle = "#5a5a52";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 27;
      }
      ctx.globalAlpha = 1;

      y += 12;
      const qrSize = 110;
      drawCard(ctx, cx, y, qrSize + 36, qrSize + 36, "rgba(255,255,255,0.92)", "#5b7fa6");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 18, qrSize, qrSize);
      y += qrSize + 36 + 26;

      ctx.font = "600 14px Georgia, serif";
      ctx.fillStyle = "#4a4a44";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#5b7fa6";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-corona",
    label: "15 Años (corona rosa)",
    swatch: "",
    bgImage: "/invitation-templates/quince-corona.jpg",
    canvasW: 1080,
    canvasH: 1440,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 800;
      ctx.fillStyle = "#8a5a52";
      ctx.font = nameFont(data.albumName, 38, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 620, 44);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 21px Georgia, serif";
        ctx.fillStyle = "#b07a6e";
        ctx.fillText(host, cx, y);
      }

      y += 28;
      ctx.font = "19px Georgia, serif";
      ctx.fillStyle = "#6b4a44";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 27;
      }
      ctx.globalAlpha = 1;

      y += 12;
      const qrSize = 110;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 24;

      ctx.font = "600 14px Georgia, serif";
      ctx.fillStyle = "#8a5a52";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#b07a6e";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-salvia",
    label: "15 Años (salvia acuarela)",
    swatch: "",
    bgImage: "/invitation-templates/quince-salvia.jpg",
    canvasW: 810,
    canvasH: 1440,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 570;
      ctx.fillStyle = "#3f5539";
      ctx.font = nameFont(data.albumName, 32, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 580, 38);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "italic 18px Georgia, serif";
        ctx.fillStyle = "#5a7a52";
        ctx.fillText(host, cx, y);
      }

      y += 26;
      ctx.font = "17px Georgia, serif";
      ctx.fillStyle = "#3f5539";
      ctx.globalAlpha = 0.8;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 25;
      }
      ctx.globalAlpha = 1;

      y += 16;
      const qrSize = 110;
      drawCard(ctx, cx, y, qrSize + 32, qrSize + 32, "rgba(255,255,255,0.85)", "#5a7a52");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 16, qrSize, qrSize);
      y += qrSize + 32 + 24;

      ctx.font = "600 13px Georgia, serif";
      ctx.fillStyle = "#3f5539";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 18;
        ctx.font = "12px Georgia, serif";
        ctx.fillStyle = "#5a7a52";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-mostaza",
    label: "15 Años (floral mostaza)",
    swatch: "",
    bgImage: "/invitation-templates/quince-mostaza.jpg",
    canvasW: 810,
    canvasH: 1440,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 500;
      ctx.fillStyle = "#7a5a1e";
      ctx.font = nameFont(data.albumName, 32, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 600, 38);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "italic 18px Georgia, serif";
        ctx.fillStyle = "#a67c2e";
        ctx.fillText(host, cx, y);
      }

      y += 26;
      ctx.font = "17px Georgia, serif";
      ctx.fillStyle = "#5a4212";
      ctx.globalAlpha = 0.8;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 25;
      }
      ctx.globalAlpha = 1;

      y += 16;
      const qrSize = 110;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 24;

      ctx.font = "600 13px Georgia, serif";
      ctx.fillStyle = "#7a5a1e";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 18;
        ctx.font = "12px Georgia, serif";
        ctx.fillStyle = "#a67c2e";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-guirnalda",
    label: "15 Años (guirnalda verde)",
    swatch: "",
    bgImage: "/invitation-templates/quince-guirnalda.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 540;
      ctx.fillStyle = "#6b7a4a";
      ctx.font = nameFont(data.albumName, 30, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 400, 34);

      const host = hostLine(data);
      if (host) {
        y += 18;
        ctx.font = "italic 17px Georgia, serif";
        ctx.fillStyle = "#8a9a6a";
        ctx.fillText(host, cx, y);
      }

      y += 22;
      ctx.font = "15px Georgia, serif";
      ctx.fillStyle = "#4a5a34";
      ctx.globalAlpha = 0.8;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 22;
      }
      ctx.globalAlpha = 1;

      y += 14;
      const qrSize = 100;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 22;

      ctx.font = "600 13px Georgia, serif";
      ctx.fillStyle = "#6b7a4a";
      ctx.fillText("Escanea para tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 18;
        ctx.font = "12px Georgia, serif";
        ctx.fillStyle = "#8a9a6a";
        ctx.fillText(`Confirma: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-hortensia",
    label: "15 Años (hortensias azules)",
    swatch: "",
    bgImage: "/invitation-templates/quince-hortensia.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 480;
      ctx.fillStyle = "#1a3a5f";
      ctx.font = nameFont(data.albumName, 40, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 46);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 22px Georgia, serif";
        ctx.fillStyle = "#4a72a0";
        ctx.fillText(host, cx, y);
      }

      y += 32;
      ctx.font = "21px Georgia, serif";
      ctx.fillStyle = "#2c4a68";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 30;
      }
      ctx.globalAlpha = 1;

      y += 25;
      const qrSize = 140;
      drawCard(ctx, cx, y, qrSize + 44, qrSize + 44, "rgba(255,255,255,0.95)", "#1a3a5f");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 22, qrSize, qrSize);
      y += qrSize + 44 + 34;

      ctx.font = "600 17px Georgia, serif";
      ctx.fillStyle = "#1a3a5f";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 24;
        ctx.font = "15px Georgia, serif";
        ctx.fillStyle = "#4a72a0";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-teal",
    label: "15 Años (guirnalda azul-teal)",
    swatch: "",
    bgImage: "/invitation-templates/quince-teal.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 400;
      ctx.fillStyle = "#2c4a68";
      ctx.font = nameFont(data.albumName, 40, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 780, 46);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 22px Georgia, serif";
        ctx.fillStyle = "#5a7a95";
        ctx.fillText(host, cx, y);
      }

      y += 32;
      ctx.font = "21px Georgia, serif";
      ctx.fillStyle = "#3c5a75";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 30;
      }
      ctx.globalAlpha = 1;

      y += 25;
      const qrSize = 150;
      drawCard(ctx, cx, y, qrSize + 44, qrSize + 44, "rgba(255,255,255,0.9)", "#5a7a95");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 22, qrSize, qrSize);
      y += qrSize + 44 + 34;

      ctx.font = "600 17px Georgia, serif";
      ctx.fillStyle = "#2c4a68";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 24;
        ctx.font = "15px Georgia, serif";
        ctx.fillStyle = "#5a7a95";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-rosas",
    label: "15 Años (rosas rosadas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-rosas.jpg",
    canvasW: 1071,
    canvasH: 1499,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 450;
      ctx.fillStyle = "#a24a5a";
      ctx.font = nameFont(data.albumName, 38, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 640, 44);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 21px Georgia, serif";
        ctx.fillStyle = "#c97a8a";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "20px Georgia, serif";
      ctx.fillStyle = "#6a3540";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 29;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 130;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 26;

      ctx.font = "600 16px Georgia, serif";
      ctx.fillStyle = "#a24a5a";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 22;
        ctx.font = "14px Georgia, serif";
        ctx.fillStyle = "#c97a8a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-rosasdoradas",
    label: "15 Años (rosas doradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-rosasdoradas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 530;
      ctx.fillStyle = "#1a1a1a";
      ctx.font = nameFont(data.albumName, 38, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 780, 44);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 21px Georgia, serif";
        ctx.fillStyle = "#b8912e";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "20px Georgia, serif";
      ctx.fillStyle = "#3a3a3a";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 29;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 140;
      drawCard(ctx, cx, y, qrSize + 40, qrSize + 40, "rgba(255,255,255,0.95)", "#b8912e");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 20, qrSize, qrSize);
      y += qrSize + 40 + 32;

      ctx.font = "600 16px Georgia, serif";
      ctx.fillStyle = "#1a1a1a";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 22;
        ctx.font = "14px Georgia, serif";
        ctx.fillStyle = "#b8912e";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-menta",
    label: "15 Años (menta minimal)",
    swatch: "",
    bgImage: "/invitation-templates/quince-menta.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 660;
      ctx.fillStyle = "#4a5238";
      ctx.font = nameFont(data.albumName, 32, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 640, 38);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "italic 19px Georgia, serif";
        ctx.fillStyle = "#6b7550";
        ctx.fillText(host, cx, y);
      }

      y += 26;
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "#3a4028";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 26;
      }
      ctx.globalAlpha = 1;

      y += 18;
      const qrSize = 120;
      drawCard(ctx, cx, y, qrSize + 36, qrSize + 36, "rgba(255,255,255,0.85)", "#4a5238");
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 18, qrSize, qrSize);
      y += qrSize + 36 + 28;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#4a5238";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#6b7550";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-olivo",
    label: "15 Años (bloque olivo)",
    swatch: "",
    bgImage: "/invitation-templates/quince-olivo.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 530;
      ctx.fillStyle = "#f5f0e0";
      ctx.font = nameFont(data.albumName, 38, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 720, 44);

      const host = hostLine(data);
      if (host) {
        y += 24;
        ctx.font = "italic 21px Georgia, serif";
        ctx.fillStyle = "#d9a8b0";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "20px Georgia, serif";
      ctx.fillStyle = "#eee7d0";
      ctx.globalAlpha = 0.9;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 29;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 130;
      ctx.fillStyle = "#ffffff";
      roundRectPath(ctx, cx - qrSize / 2 - 16, y, qrSize + 32, qrSize + 32, 14);
      ctx.fill();
      ctx.drawImage(qrImage, cx - qrSize / 2, y + 16, qrSize, qrSize);
      y += qrSize + 32 + 30;

      ctx.font = "600 16px Georgia, serif";
      ctx.fillStyle = "#f5f0e0";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 22;
        ctx.font = "14px Georgia, serif";
        ctx.fillStyle = "#d9a8b0";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-minimal",
    label: "15 Años (minimalista)",
    swatch: "",
    bgImage: "/invitation-templates/quince-minimal.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 520;
      ctx.fillStyle = "#1f1f1f";
      ctx.font = nameFont(data.albumName, 36, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 42);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 20px Georgia, serif";
        ctx.fillStyle = "#5a5a5a";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "19px Georgia, serif";
      ctx.fillStyle = "#2a2a2a";
      ctx.globalAlpha = 0.8;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 27;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 130;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 26;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#1f1f1f";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#5a5a5a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-tiara",
    label: "15 Años (tiara lavanda)",
    swatch: "",
    bgImage: "/invitation-templates/quince-tiara.jpg",
    canvasW: 1085,
    canvasH: 1530,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 700;
      ctx.fillStyle = "#6a4a8a";
      ctx.font = nameFont(data.albumName, 36, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 760, 42);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 20px Georgia, serif";
        ctx.fillStyle = "#a8862e";
        ctx.fillText(host, cx, y);
      }

      y += 30;
      ctx.font = "19px Georgia, serif";
      ctx.fillStyle = "#4a3560";
      ctx.globalAlpha = 0.8;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 27;
      }
      ctx.globalAlpha = 1;

      y += 22;
      const qrSize = 130;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 28;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#6a4a8a";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#a8862e";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-mariposas",
    label: "15 Años (mariposas azules)",
    swatch: "",
    bgImage: "/invitation-templates/quince-mariposas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 500;
      ctx.fillStyle = "#3c4f7a";
      ctx.font = nameFont(data.albumName, 34, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 660, 40);

      const host = hostLine(data);
      if (host) {
        y += 22;
        ctx.font = "italic 20px Georgia, serif";
        ctx.fillStyle = "#6a80a8";
        ctx.fillText(host, cx, y);
      }

      y += 28;
      ctx.font = "19px Georgia, serif";
      ctx.fillStyle = "#2c3a5a";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 27;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 130;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 26;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#3c4f7a";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#6a80a8";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-peonias",
    label: "15 Años (peonías moradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-peonias.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = 690;
      ctx.textAlign = "center";
      let y = 420;
      ctx.fillStyle = "#6b5266";
      ctx.font = nameFont(data.albumName, 32, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 580, 38);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "italic 19px Georgia, serif";
        ctx.fillStyle = "#8a6a86";
        ctx.fillText(host, cx, y);
      }

      y += 26;
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "#4a3846";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 26;
      }
      ctx.globalAlpha = 1;

      y += 20;
      const qrSize = 120;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 26;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#6b5266";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#8a6a86";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
  {
    id: "quince-glitter",
    label: "15 Años (glitter morado)",
    swatch: "",
    bgImage: "/invitation-templates/quince-glitter.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 560;
      ctx.fillStyle = "#5a3a70";
      ctx.font = nameFont(data.albumName, 30, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 620, 36);

      const host = hostLine(data);
      if (host) {
        y += 18;
        ctx.font = "italic 18px Georgia, serif";
        ctx.fillStyle = "#8a6aa0";
        ctx.fillText(host, cx, y);
      }

      y += 22;
      ctx.font = "17px Georgia, serif";
      ctx.fillStyle = "#4a2a5a";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 24;
      }
      ctx.globalAlpha = 1;

      // El diseño trae un recuadro decorativo vacío: el QR va justo dentro.
      const qrSize = 110;
      const boxCenterY = 1015;
      ctx.drawImage(qrImage, cx - qrSize / 2, boxCenterY - qrSize / 2, qrSize, qrSize);
    },
  },
  {
    id: "quince-margaritas",
    label: "15 Años (margaritas doradas)",
    swatch: "",
    bgImage: "/invitation-templates/quince-margaritas.jpg",
    canvasW: 1071,
    canvasH: 1500,
    draw: (ctx, data, qrImage, bg) => {
      const w = ctx.canvas.width;
      if (bg) ctx.drawImage(bg, 0, 0, w, ctx.canvas.height);

      const cx = w / 2;
      ctx.textAlign = "center";
      let y = 620;
      ctx.fillStyle = "#5a6b3a";
      ctx.font = nameFont(data.albumName, 32, "700", "Georgia, serif");
      y = wrapText(ctx, data.albumName, cx, y, 700, 38);

      const host = hostLine(data);
      if (host) {
        y += 20;
        ctx.font = "italic 19px Georgia, serif";
        ctx.fillStyle = "#c9922a";
        ctx.fillText(host, cx, y);
      }

      y += 26;
      ctx.font = "18px Georgia, serif";
      ctx.fillStyle = "#3f4a28";
      ctx.globalAlpha = 0.85;
      for (const line of detailLines(data)) {
        ctx.fillText(line, cx, y);
        y += 26;
      }
      ctx.globalAlpha = 1;

      y += 18;
      const qrSize = 120;
      ctx.drawImage(qrImage, cx - qrSize / 2, y, qrSize, qrSize);
      y += qrSize + 24;

      ctx.font = "600 15px Georgia, serif";
      ctx.fillStyle = "#5a6b3a";
      ctx.fillText("Escanea para compartir tus fotos y vídeos", cx, y);
      if (data.rsvp) {
        y += 20;
        ctx.font = "13px Georgia, serif";
        ctx.fillStyle = "#c9922a";
        ctx.fillText(`Confirma tu asistencia: ${data.rsvp}`, cx, y);
      }
    },
  },
];

async function generateInvitation(template: Template, data: InvitationData): Promise<string> {
  await ensureInvitationFonts();
  const canvas = document.createElement("canvas");
  canvas.width = template.canvasW ?? CANVAS_W;
  canvas.height = template.canvasH ?? CANVAS_H;
  const ctx = canvas.getContext("2d")!;
  const [qrImage, bgImage] = await Promise.all([
    QRCode.toDataURL(data.shareUrl, { margin: 1, width: 480 }).then(loadImage),
    template.bgImage ? loadImage(template.bgImage) : Promise.resolve(null),
  ]);
  await template.draw(ctx, data, qrImage, bgImage);
  return canvas.toDataURL("image/png");
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
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [hosts, setHosts] = useState("");
  const [rsvp, setRsvp] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const template = TEMPLATES.find((t) => t.id === templateId)!;
      setLoading(true);
      generateInvitation(template, { albumName, eventDateLabel, time, location, hosts, rsvp, shareUrl })
        .then(setPreview)
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, templateId, time, location, hosts, rsvp]);

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

              {preview && (
                <a
                  href={preview}
                  download="invitacion.png"
                  className="shimmer mt-4 flex items-center justify-center gap-2 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
                >
                  <Download size={16} /> Descargar invitación
                </a>
              )}
              <p className="mt-2 text-center text-xs text-tinta/50 sm:text-left">
                Lista para mandar por WhatsApp o imprimir.
              </p>
            </div>

            <div className="relative flex items-center justify-center">
              <button
                onClick={() => setOpen(false)}
                className="absolute right-0 top-0 hidden rounded-full bg-white/70 p-1.5 transition hover:bg-white sm:block"
              >
                <X size={16} />
              </button>
              {loading && !preview ? (
                <div className="flex aspect-[5/7] w-full items-center justify-center text-sm text-tinta/50">
                  Generando…
                </div>
              ) : preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview}
                  alt="Invitación"
                  className={`w-full rounded-xl shadow-lift transition ${loading ? "opacity-60" : ""}`}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
