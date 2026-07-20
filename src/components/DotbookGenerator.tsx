"use client";

import { useState } from "react";
import { BookOpen, X, Download } from "lucide-react";

const REAL_STYLES = [
  { id: "realGeneral", label: "Recuerdos en general" },
  { id: "realFamilia", label: "Familia" },
  { id: "realBoda", label: "Boda" },
  { id: "realQuince", label: "Quinceañera" },
  { id: "realGraduacion", label: "Graduación" },
  { id: "realComunion", label: "Primera comunión" },
  { id: "realBautizo", label: "Bautizo" },
  { id: "realBabyShower", label: "Baby shower" },
  { id: "realFiestaInfantil", label: "Fiesta infantil" },
  { id: "realViajes", label: "Viajes" },
  { id: "realNavidad", label: "Navidad" },
  { id: "realAnoNuevo", label: "Año nuevo" },
] as const;

const VECTOR_STYLES = [
  { id: "clasico", label: "Cálido floral", swatch: "from-oro to-teja" },
  { id: "elegante", label: "Elegante", swatch: "from-tinta to-oro" },
  { id: "fiesta", label: "Fiesta", swatch: "from-vino to-oro" },
  { id: "gala", label: "Gala dorada", swatch: "from-black to-oro" },
  { id: "navidad", label: "Navideño", swatch: "from-red-800 to-green-800" },
  { id: "viajes", label: "Viajes (vectorial)", swatch: "from-teja to-arena" },
] as const;

type StyleId = (typeof REAL_STYLES)[number]["id"] | (typeof VECTOR_STYLES)[number]["id"];

const ALL_LABELS: Record<StyleId, string> = Object.fromEntries([
  ...REAL_STYLES.map((s) => [s.id, s.label]),
  ...VECTOR_STYLES.map((s) => [s.id, s.label]),
]) as Record<StyleId, string>;

const THUMB_FILE: Record<(typeof REAL_STYLES)[number]["id"], string> = {
  realGeneral: "general.jpg",
  realFamilia: "familia.jpg",
  realBoda: "boda.jpg",
  realQuince: "quince.jpg",
  realGraduacion: "graduacion.jpg",
  realComunion: "comunion.jpg",
  realBautizo: "bautizo.jpg",
  realBabyShower: "babyshower.jpg",
  realFiestaInfantil: "fiestainfantil.jpg",
  realViajes: "viajes.jpg",
  realNavidad: "navidad.jpg",
  realAnoNuevo: "anonuevo.jpg",
};

export function DotbookGenerator({ albumId }: { albumId: string }) {
  const [open, setOpen] = useState(false);
  const [styleId, setStyleId] = useState<StyleId>(REAL_STYLES[0].id);

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
            className="glass flex w-full max-w-sm flex-col rounded-2xl p-5"
            style={{ maxHeight: "85vh" }}
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

            <div className="mt-3 overflow-y-auto pr-1">
              <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
                Diseño de portada
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {REAL_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    title={s.label}
                    className={`overflow-hidden rounded-lg bg-white shadow-soft transition ${
                      styleId === s.id ? "ring-2 ring-teja ring-offset-2" : "opacity-70"
                    }`}
                  >
                    <div className="aspect-square overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/dotbook-templates/thumbs/${THUMB_FILE[s.id]}`}
                        alt={s.label}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <p className="truncate px-1 py-1 text-[10px] font-medium leading-tight text-tinta/75">
                      {s.label}
                    </p>
                  </button>
                ))}
              </div>

              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-tinta/50">
                Estilos dibujados
              </p>
              <div className="mt-2 grid grid-cols-3 gap-2">
                {VECTOR_STYLES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStyleId(s.id)}
                    title={s.label}
                    className={`overflow-hidden rounded-lg bg-white shadow-soft transition ${
                      styleId === s.id ? "ring-2 ring-teja ring-offset-2" : "opacity-70"
                    }`}
                  >
                    <div className={`aspect-square bg-gradient-to-br ${s.swatch}`} />
                    <p className="truncate px-1 py-1 text-[10px] font-medium leading-tight text-tinta/75">
                      {s.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-xs text-tinta/50">{ALL_LABELS[styleId]}</p>

            <a
              href={`/api/albums/${albumId}/dotbook?style=${styleId}`}
              className="shimmer mt-3 flex items-center justify-center gap-2 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
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
