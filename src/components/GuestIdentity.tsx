"use client";

import { useState } from "react";
import { Check, Copy, KeyRound, X } from "lucide-react";

// La app reconoce a cada invitado por un código guardado en su navegador. Si
// borraba el historial o cambiaba de móvil, perdía la posibilidad de borrar
// sus propias fotos y comentarios para siempre.
//
// Con esto puede copiarse el código y pegarlo en el otro móvil para seguir
// siendo el mismo. No es una contraseña ni da acceso a nada más: solo dice
// "estas fotos las subí yo".
export function GuestIdentity({
  guestId,
  guestName,
  onChangeName,
  onRestore,
  onClose,
}: {
  guestId: string;
  guestName: string;
  onChangeName: (name: string) => void;
  onRestore: (id: string) => void;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(guestId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Tu navegador no deja copiar solo. Selecciona el código y cópialo a mano.");
    }
  }

  function restore(e: React.FormEvent) {
    e.preventDefault();
    const value = pasted.trim();
    // Es un UUID: si no lo parece, casi seguro que se ha pegado otra cosa.
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
      setError("Ese código no tiene la pinta correcta. Cópialo entero del otro móvil.");
      return;
    }
    onRestore(value);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="glass animate-fade-in w-full max-w-sm rounded-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <h2
            className="flex items-center gap-2 text-lg font-semibold"
            style={{ fontFamily: "var(--font-display)" }}
          >
            <KeyRound size={18} className="text-teja" /> Quién eres aquí
          </h2>
          <button onClick={onClose} aria-label="Cerrar" className="btn btn-ghost p-1.5">
            <X size={18} />
          </button>
        </div>

        <label className="mt-4 block text-sm font-medium text-tinta/70">Tu nombre</label>
        <input
          value={guestName}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Tu nombre (opcional)"
          maxLength={100}
          className="field mt-1"
        />

        <p className="mt-5 text-sm text-tinta/60">
          Este es tu código personal en este álbum. Guárdalo si vas a cambiar de
          móvil: te deja seguir borrando tus fotos y tus comentarios.
        </p>
        <div className="mt-2 flex items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-xl bg-arena px-3 py-2 font-mono text-xs">
            {guestId}
          </code>
          <button onClick={copy} className="btn btn-soft shrink-0 px-3 py-2">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
        </div>

        <form onSubmit={restore} className="mt-5 border-t border-tinta/10 pt-4">
          <label className="block text-sm font-medium text-tinta/70">
            ¿Vienes de otro móvil?
          </label>
          <p className="mt-0.5 text-xs text-tinta/50">
            Pega aquí el código que copiaste allí.
          </p>
          <input
            value={pasted}
            onChange={(e) => {
              setPasted(e.target.value);
              setError(null);
            }}
            placeholder="00000000-0000-0000-0000-000000000000"
            className="field mt-2 font-mono text-xs"
          />
          <button type="submit" disabled={!pasted.trim()} className="btn btn-soft mt-2 w-full">
            Usar este código
          </button>
        </form>

        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
      </div>
    </div>
  );
}
