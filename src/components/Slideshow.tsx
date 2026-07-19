"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "qrcode";
import { Gauge, X } from "lucide-react";

type MediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
  uploaderName: string | null;
  takenAt: string | null;
  createdAt: string;
};

const SPEEDS = [
  { label: "Lento", ms: 12000 },
  { label: "Normal", ms: 7000 },
  { label: "Rápido", ms: 4000 },
];
const DEFAULT_SPEED_MS = 7000;
const POLL_MS = 8000;
const VIDEO_MAX_MS = 20000;

function useSlideshowSpeed() {
  const [speedMs, setSpeedMs] = useState(DEFAULT_SPEED_MS);
  useEffect(() => {
    const saved = Number(localStorage.getItem("mv_slideshow_speed"));
    if (saved && SPEEDS.some((s) => s.ms === saved)) setSpeedMs(saved);
  }, []);
  const change = (ms: number) => {
    setSpeedMs(ms);
    localStorage.setItem("mv_slideshow_speed", String(ms));
  };
  return [speedMs, change] as const;
}

export function Slideshow({
  code,
  albumName,
  shareUrl,
}: {
  code: string;
  albumName: string;
  shareUrl: string;
}) {
  const [items, setItems] = useState<MediaItem[]>([]);
  const [index, setIndex] = useState(0);
  const [qr, setQr] = useState<string | null>(null);
  const [speedMs, setSpeedMs] = useSlideshowSpeed();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 300, margin: 1 }).then(setQr).catch(() => {});
  }, [shareUrl]);

  useEffect(() => {
    let cancelled = false;
    async function refresh() {
      try {
        const res = await fetch(`/api/guest/${code}/media`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { items: MediaItem[] };
        setItems(data.items.slice().reverse()); // más antiguas primero, como un pase cronológico
      } catch {
        // silencioso: se reintenta en el siguiente sondeo
      }
    }
    refresh();
    const poll = setInterval(refresh, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [code]);

  useEffect(() => {
    if (index >= items.length) setIndex(0);
  }, [items.length, index]);

  const current = items[index] ?? null;

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!current || items.length <= 1) return;
    const delay = current.type === "image" ? speedMs : VIDEO_MAX_MS;
    timerRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % items.length);
    }, delay);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, items.length, speedMs]);

  const caption = useMemo(() => {
    if (!current) return "";
    return current.uploaderName ? `Foto de ${current.uploaderName}` : "";
  }, [current]);

  return (
    <main className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-tinta">
      {current ? (
        <div key={current.id} className="animate-crossfade absolute inset-0 flex items-center justify-center">
          {current.type === "video" ? (
            <video
              src={current.url}
              className="max-h-full max-w-full object-contain"
              autoPlay
              muted
              playsInline
              onEnded={() => setIndex((i) => (i + 1) % Math.max(items.length, 1))}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={current.url} alt="" className="max-h-full max-w-full object-contain" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30" />
        </div>
      ) : (
        <div className="animate-fade-in flex flex-col items-center gap-3 text-center text-white/80">
          <p className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Esperando las primeras fotos…
          </p>
          <p className="text-white/50">Escanea el QR para ser el primero en compartir un recuerdo.</p>
        </div>
      )}

      <a
        href={`/a/${code}`}
        className="glass-dark absolute left-6 top-6 flex items-center gap-2 rounded-full px-4 py-2 text-sm text-white transition hover:bg-white/20"
        title="Salir del modo pantalla"
      >
        <X size={14} className="text-white/70" />
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teja opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-teja" />
        </span>
        <span
          className="max-w-[40vw] truncate"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {albumName}
        </span>
      </a>

      <div className="glass-dark absolute right-6 top-6 flex items-center gap-1.5 rounded-full p-1 text-white">
        <Gauge size={14} className="ml-2 text-white/60" />
        {SPEEDS.map((s) => (
          <button
            key={s.ms}
            onClick={() => setSpeedMs(s.ms)}
            className={`rounded-full px-2.5 py-1 text-xs font-semibold transition ${
              speedMs === s.ms ? "bg-teja text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {caption && (
        <div className="glass-dark absolute bottom-6 left-6 rounded-2xl px-5 py-3 text-white">
          <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
            {caption}
          </p>
        </div>
      )}

      {qr && (
        <div className="glass-dark absolute bottom-6 right-6 flex items-center gap-3 rounded-2xl p-3 text-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="Código QR" className="h-20 w-20 rounded-lg bg-white p-1" />
          <span className="max-w-[16ch] text-sm leading-tight text-white/80">
            Escanea para unirte y subir tus fotos
          </span>
        </div>
      )}
    </main>
  );
}
