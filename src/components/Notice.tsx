"use client";

import { useEffect } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

// Avisos dentro de la página, en vez de los alert() del navegador (que en el
// móvil salen como una ventana del sistema, feos y fuera de contexto).

export type NoticeState = { tone: "ok" | "error"; text: string };

export function Notice({
  notice,
  onClose,
}: {
  notice: NoticeState | null;
  onClose: () => void;
}) {
  const ok = notice?.tone === "ok";

  // Los mensajes de «todo bien» se van solos; los errores se quedan hasta que
  // la persona los cierra, para que le dé tiempo a leer qué ha pasado.
  useEffect(() => {
    if (!notice || notice.tone !== "ok") return;
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [notice, onClose]);

  if (!notice) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-fade-in fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:bottom-4"
    >
      <div
        className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-lg backdrop-blur ${
          ok
            ? "border-emerald-600/20 bg-emerald-50/95 text-emerald-900"
            : "border-red-600/20 bg-red-50/95 text-red-900"
        }`}
      >
        <span className="mt-0.5 shrink-0">
          {ok ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
        </span>
        <p className="min-w-0 flex-1 text-sm leading-snug break-words">{notice.text}</p>
        <button
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-mr-1 shrink-0 rounded-full p-1 opacity-60 transition hover:opacity-100"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
