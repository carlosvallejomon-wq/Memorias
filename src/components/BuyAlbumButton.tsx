"use client";

import { useState } from "react";
import { CreditCard, LoaderCircle } from "lucide-react";

export function BuyAlbumButton({ english = false }: { english?: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function startCheckout() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/stripe/checkout", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !body.url) throw new Error(body.error || "No se pudo iniciar el pago.");
      window.location.assign(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button type="button" onClick={startCheckout} disabled={loading} className="btn btn-primary shimmer w-full px-6 py-3 disabled:opacity-60">
        {loading ? <LoaderCircle size={18} className="animate-spin" /> : <CreditCard size={18} />}
        {loading ? (english ? "Opening secure checkout…" : "Abriendo pago seguro…") : (english ? "Get my album for $39" : "Obtener mi álbum por $39")}
      </button>
      {error && <p className="mt-2 text-center text-xs text-red-700">{error}</p>}
    </div>
  );
}
