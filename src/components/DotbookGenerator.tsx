"use client";

import { useState } from "react";
import { BookOpen, X, Download } from "lucide-react";

const STYLES = [
  { id: "clasico", label: "Cálido floral", swatch: "from-oro to-teja" },
  { id: "elegante", label: "Elegante", swatch: "from-tinta to-oro" },
  { id: "fiesta", label: "Fiesta", swatch: "from-vino to-oro" },
  { id: "gala", label: "Gala dorada", swatch: "from-black to-oro" },
  { id: "navidad", label: "Navideño", swatch: "from-red-800 to-green-800" },
  { id: "viajes", label: "Viajes", swatch: "from-teja to-arena" },
] as const;

export function DotbookGenerator({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);
  const [styleId, setStyleId] = useState<(typeof STYLES)[number]["id"]>(STYLES[0].id);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="shimmer flex items-center gap-2 rounded-full border border-tinta/15 bg-white px-4 py-2 text-sm font-semibold shadow-soft transition hover:bg-arena"
      >
        <BookOpen size={16} /> Dotbook
      </button>

      {open && (
        <div
          className="animate-fade-in fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-8"
          onClick={() => setOpen(false)}
        >
          <div
            className="glass w-full max-w-sm rounded-2xl p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-semibold">
                <BookOpen size={18} className="text-teja" /> Dotbook
              </h2>
              <button
                onClick={() => setOpen(false)}
                className="rounded-full bg-white/70 p-1.5 transition hover:bg-white"
              >
                <X size={16} />
              </button>
            </div>

            <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-tinta/50">
              Estilo de portada
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStyleId(s.id)}
                  title={s.label}
                  className={`aspect-[3/4] rounded-lg bg-gradient-to-br shadow-soft transition ${s.swatch} ${
                    styleId === s.id ? "ring-2 ring-teja ring-offset-2" : "opacity-70"
                  }`}
                />
              ))}
            </div>
            <p className="mt-1.5 text-xs text-tinta/50">
              {STYLES.find((s) => s.id === styleId)?.label}
            </p>

            <a
              href={`/api/albums/${albumId}/dotbook?style=${styleId}`}
              className="shimmer mt-4 flex items-center justify-center gap-2 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
            >
              <Download size={16} /> Descargar Dotbook
            </a>
            <p className="mt-2 text-center text-xs text-tinta/50">
              Un PDF con una página por cada foto y vídeo del álbum.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
