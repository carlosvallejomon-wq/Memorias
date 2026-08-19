"use client";

import { useRef, useState } from "react";
import type { ReactNode } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export function BuyAlbumButton({
  english = false,
  label,
  className = "w-full px-6 py-3",
}: {
  english?: boolean;
  label?: ReactNode;
  className?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // En algunos navegadores móviles el primer toque solo activa el control.
  // Arrancar al soltar el dedo evita pedir un segundo toque; la referencia
  // también impide crear dos sesiones si llega el click sintético después.
  const checkoutStarted = useRef(false);

  async function startCheckout() {
    if (checkoutStarted.current) return;
    checkoutStarted.current = true;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const raw = await response.text();
      let body: { url?: string; error?: string } = {};
      try {
        body = JSON.parse(raw) as { url?: string; error?: string };
      } catch {
        // Si una configuración externa devuelve HTML, mostramos un mensaje
        // claro en vez del error "Unexpected token <".
      }
      if (response.status === 401) {
        window.location.href = `/sign-in?redirect_url=${encodeURIComponent(window.location.href)}`;
        return;
      }
      if (!response.ok || !body.url) throw new Error(body.error || "No se pudo iniciar el pago.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
      setLoading(false);
      checkoutStarted.current = false;
    }
  }

  return (
    <div>
      <button
        type="button"
        onPointerUp={startCheckout}
        onClick={(event) => {
          // Los teclados y lectores de pantalla emiten click sin puntero.
          if (event.detail === 0) startCheckout();
        }}
        disabled={loading}
        className={`btn btn-primary shimmer ${className} disabled:opacity-60`}
      >
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {loading
          ? (english ? "Opening secure checkout…" : "Abriendo pago seguro…")
          : (label ?? (english ? "Get my album for $39" : "Obtener mi álbum por $39"))}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}
