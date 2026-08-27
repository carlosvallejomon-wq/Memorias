"use client";

import { Adorno } from "@/components/InvitationOrnaments";
import { NOMBRES_DE_EVENTO, PLANTILLAS, type PlantillaInvitacion } from "@/lib/invitation-styles";

/**
 * Miniatura de una plantilla, dibujada con sus propios colores y su adorno.
 *
 * No hay imágenes de muestra que mantener: la miniatura sale de la misma
 * definición que la invitación, así que añadir una plantilla al catálogo la
 * hace aparecer aquí con su aspecto real.
 */
function Miniatura({ plantilla }: { plantilla: PlantillaInvitacion }) {
  const p = plantilla.paleta;
  const franja = plantilla.bandas === "alternas" ? p.band : p.soft;
  const forma =
    plantilla.marco === "ovalo"
      ? "50%"
      : plantilla.marco === "recto"
        ? "2px"
        : "50% 50% 3px 3px / 26% 26% 2% 2%";
  return (
    <span className="block overflow-hidden rounded-md" style={{ backgroundColor: p.paper }}>
      <span className="flex aspect-[3/4] flex-col items-center justify-start gap-1 px-2 pt-2">
        <span className="h-1 w-6 rounded-full" style={{ backgroundColor: p.accent, opacity: 0.5 }} />
        <span
          className="mt-0.5 block w-10 border"
          style={{ aspectRatio: "3 / 4", backgroundColor: p.mezcla, borderRadius: forma, borderColor: p.accent }}
        />
        <span className="mt-0.5 block w-full" style={{ color: p.accent }}>
          <Adorno motivo={plantilla.motivo} className="mx-auto h-3 w-12" opacidad={0.9} />
        </span>
        <span className="mt-auto block h-4 w-[calc(100%+1rem)]" style={{ backgroundColor: franja }} />
      </span>
    </span>
  );
}

/** Rejilla de plantillas, agrupadas por tipo de evento. */
export function SelectorPlantilla({
  valor,
  onChange,
}: {
  valor: string;
  onChange: (id: string) => void;
}) {
  const eventos = [...new Set(PLANTILLAS.map((p) => p.evento))];
  return (
    <div className="grid gap-3">
      {eventos.map((evento) => (
        <div key={evento}>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tinta/45">
            {NOMBRES_DE_EVENTO[evento]}
          </p>
          <div className="mt-1.5 grid grid-cols-3 gap-2">
            {PLANTILLAS.filter((p) => p.evento === evento).map((plantilla) => {
              const elegida = valor === plantilla.id;
              return (
                <button
                  key={plantilla.id}
                  type="button"
                  onClick={() => onChange(plantilla.id)}
                  aria-pressed={elegida}
                  className={`rounded-lg border p-1 text-left transition ${
                    elegida ? "border-teja ring-2 ring-teja/30" : "border-tinta/15 hover:border-tinta/35"
                  }`}
                >
                  <Miniatura plantilla={plantilla} />
                  <span className="mt-1 block truncate px-0.5 text-[10px] font-medium text-tinta/70">
                    {plantilla.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
