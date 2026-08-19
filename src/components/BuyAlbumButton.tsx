"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { useAuth, useClerk } from "@clerk/nextjs";
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
  const { isLoaded, isSignedIn } = useAuth();
  const { redirectToSignIn } = useClerk();

  async function startCheckout() {
    // El endpoint de pago requiere una cuenta para asignar la compra al dueño
    // del álbum. Al comprobarlo aquí evitamos que el fetch reciba el HTML de
    // inicio de sesión y muestre un error técnico de JSON.
    if (!isLoaded) return;
    if (!isSignedIn) {
      await redirectToSignIn({ redirectUrl: window.location.href });
      return;
    }

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
      if (!response.ok || !body.url) throw new Error(body.error || "No se pudo iniciar el pago.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={startCheckout} disabled={loading} className={`btn btn-primary shimmer ${className} disabled:opacity-60`}>
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {loading
          ? (english ? "Opening secure checkout…" : "Abriendo pago seguro…")
          : (label ?? (english ? "Get my album for $39" : "Obtener mi álbum por $39"))}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}
