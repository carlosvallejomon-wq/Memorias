"use client";

import { useState } from "react";
import { CalendarHeart, Users } from "lucide-react";

const OPTIONS = [
  {
    value: "evento" as const,
    icon: CalendarHeart,
    title: "Evento",
    text: "Bodas, cumpleaños, viajes — con fecha e invitados que suben fotos ese día.",
  },
  {
    value: "familia" as const,
    icon: Users,
    title: "Familia",
    text: "Un espacio continuo, sin fecha límite, para ir sumando recuerdos con el tiempo.",
  },
];

export function AlbumKindPicker() {
  const [kind, setKind] = useState<"evento" | "familia">("evento");

  return (
    <div>
      <div className="grid gap-3 sm:grid-cols-2">
        {OPTIONS.map((opt) => {
          const selected = kind === opt.value;
          return (
            <label
              key={opt.value}
              className={`card-interactive flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition ${
                selected
                  ? "border-teja bg-white shadow-lift"
                  : "border-transparent bg-white/60 shadow-soft hover:bg-white"
              }`}
            >
              <input
                type="radio"
                name="kind"
                value={opt.value}
                checked={selected}
                onChange={() => setKind(opt.value)}
                className="sr-only"
              />
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br shadow-soft ${
                  selected ? "from-teja/25 to-teja/10 text-teja-oscuro" : "from-tinta/10 to-tinta/5 text-tinta/50"
                }`}
              >
                <opt.icon size={20} />
              </div>
              <div>
                <p className={`font-semibold ${selected ? "text-teja-oscuro" : "text-tinta"}`}>
                  {opt.title}
                </p>
                <p className="mt-0.5 text-xs text-tinta/60">{opt.text}</p>
              </div>
            </label>
          );
        })}
      </div>

      {kind === "evento" && (
        <div className="mt-3">
          <label className="mb-1 block text-xs font-semibold text-tinta/50">
            Fecha del evento (opcional)
          </label>
          <input
            name="eventDate"
            type="date"
            className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
          />
        </div>
      )}
    </div>
  );
}
