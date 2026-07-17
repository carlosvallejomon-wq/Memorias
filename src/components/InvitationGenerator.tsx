"use client";

import { useState } from "react";
import QRCode from "qrcode";
import { PartyPopper, X, Download } from "lucide-react";

const CANVAS_W = 1000;
const CANVAS_H = 1400;

async function drawInvitation(
  albumName: string,
  eventDateLabel: string | null,
  shareUrl: string,
): Promise<string> {
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W;
  canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d")!;

  // Fondo cálido con degradado suave.
  const bg = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
  bg.addColorStop(0, "#fbf3e7");
  bg.addColorStop(0.55, "#faf6f0");
  bg.addColorStop(1, "#f3e4d2");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  // Borde decorativo doble.
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
  ctx.font = "italic 34px Georgia, serif";
  ctx.fillText("Estás invitado a", CANVAS_W / 2, 260);

  ctx.fillStyle = "#2b2118";
  ctx.font = "700 64px Georgia, serif";
  wrapText(ctx, albumName, CANVAS_W / 2, 350, CANVAS_W - 220, 72);

  if (eventDateLabel) {
    ctx.fillStyle = "#2b2118";
    ctx.globalAlpha = 0.7;
    ctx.font = "28px Georgia, serif";
    ctx.fillText(eventDateLabel, CANVAS_W / 2, 500);
    ctx.globalAlpha = 1;
  }

  // Filete decorativo con rombo central.
  const ruleY = 560;
  ctx.strokeStyle = "#c2571b";
  ctx.globalAlpha = 0.5;
  ctx.beginPath();
  ctx.moveTo(260, ruleY);
  ctx.lineTo(460, ruleY);
  ctx.moveTo(540, ruleY);
  ctx.lineTo(740, ruleY);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#c2571b";
  ctx.save();
  ctx.translate(CANVAS_W / 2, ruleY);
  ctx.rotate(Math.PI / 4);
  ctx.fillRect(-7, -7, 14, 14);
  ctx.restore();

  const qrDataUrl = await QRCode.toDataURL(shareUrl, { margin: 1, width: 480 });
  const qrImage = await loadImage(qrDataUrl);
  const qrSize = 400;
  const qrX = (CANVAS_W - qrSize) / 2;
  const qrY = 630;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  ctx.strokeStyle = "#efe6d8";
  ctx.strokeRect(qrX - 20, qrY - 20, qrSize + 40, qrSize + 40);
  ctx.drawImage(qrImage, qrX, qrY, qrSize, qrSize);

  ctx.fillStyle = "#2b2118";
  ctx.globalAlpha = 0.75;
  ctx.font = "26px Georgia, serif";
  ctx.fillText("Escanea para compartir tus fotos y vídeos", CANVAS_W / 2, qrY + qrSize + 90);
  ctx.globalAlpha = 0.5;
  ctx.font = "20px Georgia, serif";
  ctx.fillText("No hace falta instalar nada", CANVAS_W / 2, qrY + qrSize + 128);
  ctx.globalAlpha = 1;

  return canvas.toDataURL("image/png");
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
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

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
  const [preview, setPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function generate() {
    setOpen(true);
    setLoading(true);
    try {
      const dataUrl = await drawInvitation(albumName, eventDateLabel, shareUrl);
      setPreview(dataUrl);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        onClick={generate}
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
            className="glass max-h-full w-full max-w-sm overflow-y-auto rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <PartyPopper size={18} className="text-teja" /> Invitación
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/70 p-1.5 transition hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>

            {loading ? (
              <div className="flex aspect-[5/7] items-center justify-center text-sm text-tinta/50">
                Generando…
              </div>
            ) : preview ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={preview} alt="Invitación" className="mt-4 w-full rounded-xl shadow-lift" />
                <a
                  href={preview}
                  download="invitacion.png"
                  className="shimmer mt-4 flex items-center justify-center gap-2 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
                >
                  <Download size={16} /> Descargar invitación
                </a>
                <p className="mt-2 text-center text-xs text-tinta/50">
                  Lista para mandar por WhatsApp o imprimir.
                </p>
              </>
            ) : null}
          </div>
        </div>
      )}
    </>
  );
}
