"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink, UserRoundCog } from "lucide-react";

/**
 * El enlace que el organizador le pasa al dueño del evento.
 *
 * Pensado para quien crea álbumes por encargo —una agencia, un fotógrafo—:
 * su cliente no tiene cuenta, pero la portada de su libro y su invitación son
 * decisiones suyas. Con este enlace las toma él, sin registrarse y sin ver los
 * álbumes de los demás clientes.
 */
export function ClientLinkCard({ clientUrl }: { clientUrl: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(clientUrl);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // Fuera de HTTPS el portapapeles falla; el texto se puede seleccionar.
    }
  }

  return (
    <section className="glass mt-4 rounded-2xl p-5">
      <h2 className="flex items-center gap-2 font-semibold">
        <UserRoundCog size={18} className="text-teja" /> Enlace para el dueño del evento
      </h2>
      <p className="mt-1 text-sm text-tinta/60">
        Mándaselo a quien celebra el evento y elegirá él mismo su invitación y
        la portada de su libro, sin necesitar cuenta. No verá el panel ni el
        resto de tus álbumes.
      </p>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={clientUrl}
          onFocus={(e) => e.currentTarget.select()}
          className="field min-w-0 flex-1 text-sm"
          aria-label="Enlace para el dueño del evento"
        />
        <div className="flex gap-2">
          <button onClick={copiar} className="btn btn-soft px-4 py-2 text-sm">
            {copiado ? <Check size={15} /> : <Copy size={15} />}
            {copiado ? "Copiado" : "Copiar"}
          </button>
          <a
            href={clientUrl}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost px-3 py-2 text-sm"
            aria-label="Abrir el enlace en otra pestaña"
          >
            <ExternalLink size={15} />
          </a>
        </div>
      </div>
    </section>
  );
}
