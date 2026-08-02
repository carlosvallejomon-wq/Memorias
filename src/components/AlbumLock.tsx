"use client";

import { useState } from "react";
import { Camera, KeyRound, Loader2 } from "lucide-react";

// Pantalla que sale cuando el organizador ha puesto un código de acceso. Solo
// aparece en esos álbumes: si no hay código, el invitado nunca la ve.
export function AlbumLock({ code, albumName }: { code: string; albumName: string }) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!pin.trim() || enviando) return;
    setEnviando(true);
    setError(null);
    try {
      const res = await fetch(`/api/guest/${code}/acceso`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      if (res.ok) {
        // Recargar: la página comprueba la cookie en el servidor.
        window.location.reload();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "No se ha podido comprobar el código.");
    } catch {
      setError("No hay conexión. Inténtalo otra vez.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">
      <span className="flex items-center gap-1.5 text-sm text-tinta/40">
        <Camera size={14} /> Memorias Vivas
      </span>

      <span className="mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-arena text-teja">
        <KeyRound size={26} />
      </span>

      <h1
        className="text-balance mt-4 text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {albumName}
      </h1>
      <p className="mt-2 text-tinta/60">
        Este álbum tiene un código de acceso. Pídeselo a quien organiza el
        evento; solo hace falta ponerlo una vez en este móvil.
      </p>

      <form onSubmit={enviar} className="mt-6 w-full">
        <input
          autoFocus
          value={pin}
          onChange={(e) => {
            setPin(e.target.value.replace(/\D/g, "").slice(0, 8));
            setError(null);
          }}
          // Teclado numérico en el móvil, y no lo autocompleta con una
          // contraseña guardada de otro sitio.
          inputMode="numeric"
          autoComplete="off"
          placeholder="Código"
          aria-label="Código de acceso del álbum"
          className="field text-center text-2xl tracking-[0.4em]"
        />
        <button
          type="submit"
          disabled={!pin.trim() || enviando}
          className="btn btn-primary shimmer mt-3 w-full"
        >
          {enviando ? <Loader2 size={16} className="animate-spin" /> : null}
          Entrar al álbum
        </button>
      </form>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-700">
          {error}
        </p>
      )}
    </main>
  );
}
