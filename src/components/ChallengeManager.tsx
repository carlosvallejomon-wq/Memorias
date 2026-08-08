"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Plus, Target, Trash2, Wand2 } from "lucide-react";
import {
  addSuggestedChallenges,
  createChallenge,
  deleteChallenge,
} from "@/app/dashboard/actions";
import { ChallengeIcon } from "@/components/ChallengeIcon";
import {
  CHALLENGE_ICONS,
  DEFAULT_CHALLENGE_ICON,
  challengeIconStyle,
} from "@/lib/challenge-icons";

export type ChallengeRow = {
  id: string;
  title: string;
  emoji: string | null;
  photoCount: number;
};

// Iconos que se ofrecen al crear un reto (los del catálogo, en este orden).
const ICON_CHOICES = [
  "camara",
  "brindis",
  "baile",
  "grupo",
  "tarta",
  "regalo",
  "detalles",
  "amor",
  "risa",
  "fiesta",
  "flores",
  "mascota",
  "amanecer",
  "comida",
  "viaje",
  "zapatos",
];

function DeleteChallengeButton({ id, title }: { id: string; title: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      disabled={pending}
      title="Borrar reto"
      onClick={() => {
        if (
          confirm(
            `¿Borrar el reto «${title}»? Las fotos que ya se hayan subido se quedan en el álbum.`,
          )
        ) {
          startTransition(() => deleteChallenge(id));
        }
      }}
      className="rounded-full p-2 text-tinta/40 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
    </button>
  );
}

export function ChallengeManager({
  albumId,
  challenges,
}: {
  albumId: string;
  challenges: ChallengeRow[];
}) {
  const [emoji, setEmoji] = useState(DEFAULT_CHALLENGE_ICON);
  const [pending, startTransition] = useTransition();
  const [suggesting, startSuggesting] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  const done = challenges.filter((c) => c.photoCount > 0).length;

  return (
    <section className="mt-8 rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[16rem] flex-1">
          <h2 className="flex items-center gap-2 font-semibold">
            <Target size={18} className="text-teja" /> Retos fotográficos
          </h2>
          <p className="mt-1 text-sm text-tinta/60">
            Pequeñas misiones que verán tus invitados en el álbum. Ayudan a que
            suban fotos con gracia en vez de mirar una galería vacía.
          </p>
        </div>
        {challenges.length > 0 && (
          <p className="rounded-full bg-arena px-3 py-1 text-sm font-semibold text-tinta/70">
            {done} de {challenges.length} con fotos
          </p>
        )}
      </div>

      {challenges.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-tinta/20 bg-crema p-5 text-center">
          <p className="text-sm text-tinta/60">
            Todavía no hay retos. Puedes empezar con una lista ya preparada y
            luego cambiar lo que quieras.
          </p>
          <button
            disabled={suggesting}
            onClick={() => startSuggesting(() => addSuggestedChallenges(albumId))}
            className="btn btn-primary shimmer mt-3"
          >
            {suggesting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Wand2 size={16} />
            )}
            Añadir retos sugeridos
          </button>
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {challenges.map((c) => (
            <li
              key={c.id}
              className="flex items-center gap-3 rounded-xl border border-tinta/10 bg-crema px-3 py-2"
            >
              <span
                style={challengeIconStyle(c.emoji)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-teja shadow-soft"
              >
                <ChallengeIcon icon={c.emoji} size={17} />
              </span>
              <span className="min-w-0 flex-1 truncate font-medium">{c.title}</span>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  c.photoCount > 0
                    ? "bg-teja/15 text-teja-oscuro"
                    : "bg-tinta/8 text-tinta/50"
                }`}
              >
                {c.photoCount} {c.photoCount === 1 ? "foto" : "fotos"}
              </span>
              <DeleteChallengeButton id={c.id} title={c.title} />
            </li>
          ))}
        </ul>
      )}

      <form
        ref={formRef}
        action={(formData) =>
          startTransition(async () => {
            await createChallenge(albumId, formData);
            formRef.current?.reset();
            setEmoji(DEFAULT_CHALLENGE_ICON);
          })
        }
        className="mt-5 rounded-xl border border-tinta/10 bg-crema p-4"
      >
        <input type="hidden" name="emoji" value={emoji} />
        <p className="text-xs font-semibold uppercase tracking-wide text-tinta/50">
          Elige un icono
        </p>
        <div className="scroll-x mt-2 flex gap-1.5 pb-1">
          {ICON_CHOICES.map((id) => {
            const info = CHALLENGE_ICONS[id];
            const elegido = emoji === id;
            return (
              <button
                key={id}
                type="button"
                title={info?.label ?? id}
                aria-pressed={elegido}
                onClick={() => setEmoji(id)}
                // Cada icono con su color: sin elegir va sobre su fondo suave;
                // el elegido invierte a color pleno y se marca con un aro.
                style={
                  info
                    ? elegido
                      ? { backgroundColor: info.color, color: "#fff", boxShadow: `0 0 0 3px ${info.bg}` }
                      : { backgroundColor: info.bg, color: info.color }
                    : undefined
                }
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition hover:scale-105 ${
                  elegido ? "shadow-soft" : ""
                }`}
              >
                <ChallengeIcon icon={id} size={18} />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {/* El ancho mínimo hace que en el móvil el campo salte a su propia
              línea en vez de quedarse aplastado junto al botón. */}
          <input
            name="title"
            required
            maxLength={120}
            placeholder="Nuevo reto — p. ej. «Una foto con los novios»"
            className="field min-w-[14rem] flex-1"
          />
          <button disabled={pending} type="submit" className="btn btn-primary shimmer">
            {pending ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            Añadir
          </button>
        </div>
      </form>
    </section>
  );
}
