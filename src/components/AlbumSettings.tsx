"use client";

import { useState, useTransition } from "react";
import { CalendarX, Check, KeyRound, Loader2, Lock, LockOpen } from "lucide-react";
import { setAlbumExpiry, setAlbumPin } from "@/app/dashboard/actions";
import { expiryWarning, formatDate } from "@/lib/expiry";

// Dos ajustes que vienen APAGADOS. Mientras el organizador no los toque, el
// álbum se comporta exactamente igual que siempre: se entra con el enlace y
// no caduca nunca.
export function AlbumSettings({
  albumId,
  tienePin,
  expiresAt,
}: {
  albumId: string;
  tienePin: boolean;
  expiresAt: string | null;
}) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <Lock size={18} className="text-tinta/50" /> Acceso y caducidad
      </h2>
      <p className="mt-1 text-sm text-tinta/50">
        Las dos cosas están apagadas por defecto. Solo cambian si tú lo decides.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <PinCard albumId={albumId} tienePin={tienePin} />
        <ExpiryCard albumId={albumId} expiresAt={expiresAt} />
      </div>
    </section>
  );
}

function PinCard({ albumId, tienePin }: { albumId: string; tienePin: boolean }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pending, startTransition] = useTransition();

  function guardar(valor: string) {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const err = await setAlbumPin(albumId, valor);
      if (err) return setError(err);
      setPin("");
      setGuardado(true);
    });
  }

  return (
    <div className="rounded-2xl border border-tinta/8 bg-white/70 p-4 shadow-soft">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <KeyRound size={15} className="text-teja" /> Código de acceso
        {tienePin ? (
          <span className="chip bg-teja/10 text-teja">Activado</span>
        ) : (
          <span className="chip">Desactivado</span>
        )}
      </p>
      <p className="mt-1.5 text-sm text-tinta/55">
        {tienePin
          ? "Ahora mismo hay que teclear un código para entrar. Cada invitado solo lo pone una vez en su móvil."
          : "Ahora mismo entra cualquiera con el enlace, que es lo normal. Si prefieres, puedes pedir un código de 4 a 8 números."}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar(pin);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setError(null);
            setGuardado(false);
          }}
          inputMode="numeric"
          autoComplete="off"
          placeholder={tienePin ? "Cambiar el código" : "Ej. 1234"}
          aria-label="Código de acceso"
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={!pin || pending}
          className="btn btn-primary shrink-0 px-4"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          Guardar
        </button>
      </form>

      {tienePin && (
        <button
          onClick={() => {
            if (confirm("¿Quitar el código? El álbum volverá a abrirse solo con el enlace.")) {
              guardar("");
            }
          }}
          disabled={pending}
          className="btn btn-ghost mt-2 px-2 text-sm"
        >
          <LockOpen size={15} /> Quitar el código
        </button>
      )}

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {guardado && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
          <Check size={14} /> Guardado
        </p>
      )}
    </div>
  );
}

function ExpiryCard({ albumId, expiresAt }: { albumId: string; expiresAt: string | null }) {
  const [fecha, setFecha] = useState(expiresAt ? expiresAt.slice(0, 10) : "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [pending, startTransition] = useTransition();
  const aviso = expiryWarning(expiresAt);

  function guardar(valor: string) {
    setError(null);
    setGuardado(false);
    startTransition(async () => {
      const err = await setAlbumExpiry(albumId, valor);
      if (err) return setError(err);
      setGuardado(true);
    });
  }

  return (
    <div className="rounded-2xl border border-tinta/8 bg-white/70 p-4 shadow-soft">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <CalendarX size={15} className="text-teja" /> Borrado automático
        {expiresAt ? (
          <span className="chip bg-teja/10 text-teja">{formatDate(expiresAt)}</span>
        ) : (
          <span className="chip">Nunca</span>
        )}
      </p>
      <p className="mt-1.5 text-sm text-tinta/55">
        {expiresAt
          ? "Ese día se borrarán todas las fotos, vídeos y mensajes de este álbum, sin vuelta atrás. Se avisa a los invitados con antelación."
          : "Ahora mismo el álbum se guarda para siempre. Si quieres que se borre solo pasada una fecha, elígela aquí."}
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          guardar(fecha);
        }}
        className="mt-3 flex gap-2"
      >
        <input
          type="date"
          value={fecha}
          onChange={(e) => {
            setFecha(e.target.value);
            setError(null);
            setGuardado(false);
          }}
          aria-label="Fecha de borrado automático"
          className="field flex-1"
        />
        <button
          type="submit"
          disabled={!fecha || pending}
          className="btn btn-primary shrink-0 px-4"
        >
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          Guardar
        </button>
      </form>

      {expiresAt && (
        <button
          onClick={() => {
            setFecha("");
            guardar("");
          }}
          disabled={pending}
          className="btn btn-ghost mt-2 px-2 text-sm"
        >
          Que no se borre nunca
        </button>
      )}

      {aviso?.urgente && (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">
          {aviso.texto} Descarga el ZIP si quieres conservarlo.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      {guardado && !error && (
        <p className="mt-2 flex items-center gap-1.5 text-sm text-emerald-700">
          <Check size={14} /> Guardado
        </p>
      )}
    </div>
  );
}
