"use client";

import { Camera, Check, Target } from "lucide-react";
import type { ChallengeItem } from "@/lib/guest-types";

// Tablero de retos del invitado: cada tarjeta abre el selector de archivos ya
// asociado a ese reto, así la foto queda etiquetada sin pasos extra.
export function GuestChallenges({
  challenges,
  onUpload,
  onSee,
}: {
  challenges: ChallengeItem[] | null;
  onUpload: (challenge: ChallengeItem) => void;
  onSee: (challenge: ChallengeItem) => void;
}) {
  if (challenges === null) {
    return (
      <div className="mt-6 space-y-3">
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 rounded-2xl" />
        <div className="skeleton h-20 w-2/3 rounded-2xl" />
      </div>
    );
  }

  if (challenges.length === 0) {
    return (
      <div className="mt-10 flex flex-col items-center gap-2 text-center text-tinta/60">
        <Target size={34} className="text-teja/60" />
        <p>
          El organizador todavía no ha propuesto retos.
          <br />
          Puedes subir las fotos que quieras desde la galería.
        </p>
      </div>
    );
  }

  const done = challenges.filter((c) => c.photoCount > 0).length;
  const percent = Math.round((done / challenges.length) * 100);

  return (
    <div className="mt-6">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2
            className="flex items-center gap-2 font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <Target size={17} className="text-teja" /> Retos del evento
          </h2>
          <span className="text-sm font-semibold text-tinta/60">
            {done} de {challenges.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-tinta/60">
          Ideas para que no se quede ningún momento sin foto. Toca un reto y
          elige la foto desde tu móvil.
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-tinta/10">
          <div
            className="h-full rounded-full bg-teja transition-[width] duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {challenges.map((c) => {
          const complete = c.photoCount > 0;
          return (
            <li
              key={c.id}
              className={`card-interactive flex items-center gap-3 rounded-2xl border p-4 shadow-soft ${
                complete ? "border-teja/30 bg-teja/5" : "border-tinta/10 bg-white"
              }`}
            >
              <span className="text-2xl">{c.emoji || "📸"}</span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{c.title}</p>
                {complete ? (
                  <button
                    onClick={() => onSee(c)}
                    className="mt-0.5 flex items-center gap-1 text-sm text-teja-oscuro hover:underline"
                  >
                    <Check size={14} /> {c.photoCount}{" "}
                    {c.photoCount === 1 ? "foto subida" : "fotos subidas"} · ver
                  </button>
                ) : (
                  <p className="mt-0.5 text-sm text-tinta/50">Aún sin fotos</p>
                )}
              </div>
              <button
                onClick={() => onUpload(c)}
                className="btn btn-primary shrink-0 px-4 py-2 text-sm"
              >
                <Camera size={15} />
                <span className="hidden sm:inline">Subir</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
