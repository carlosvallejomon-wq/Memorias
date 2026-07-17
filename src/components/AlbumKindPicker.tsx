"use client";

import { useState } from "react";
import { CalendarHeart, Users } from "lucide-react";

export function AlbumKindPicker() {
  const [kind, setKind] = useState<"evento" | "familia">("evento");

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex gap-2">
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition ${
            kind === "evento"
              ? "border-teja bg-teja/10 text-teja-oscuro"
              : "border-tinta/15 bg-white/80 text-tinta/60"
          }`}
        >
          <input
            type="radio"
            name="kind"
            value="evento"
            checked={kind === "evento"}
            onChange={() => setKind("evento")}
            className="sr-only"
          />
          <CalendarHeart size={15} /> Evento
        </label>
        <label
          className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition ${
            kind === "familia"
              ? "border-teja bg-teja/10 text-teja-oscuro"
              : "border-tinta/15 bg-white/80 text-tinta/60"
          }`}
        >
          <input
            type="radio"
            name="kind"
            value="familia"
            checked={kind === "familia"}
            onChange={() => setKind("familia")}
            className="sr-only"
          />
          <Users size={15} /> Familia
        </label>
      </div>
      {kind === "evento" ? (
        <input
          name="eventDate"
          type="date"
          className="rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
        />
      ) : (
        <p className="text-xs text-tinta/50">
          Sin fecha fija — un álbum continuo para ir sumando recuerdos.
        </p>
      )}
    </div>
  );
}
