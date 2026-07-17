"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

export function ShareCard({ shareUrl }: { shareUrl: string }) {
  const [qr, setQr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    QRCode.toDataURL(shareUrl, { width: 512, margin: 2 })
      .then(setQr)
      .catch(console.error);
  }, [shareUrl]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El portapapeles puede fallar fuera de HTTPS; el usuario aún puede
      // seleccionar el texto a mano.
    }
  }

  return (
    <section className="mt-6 flex flex-col items-center gap-5 rounded-2xl bg-arena p-5 sm:flex-row">
      {qr && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={qr}
          alt="Código QR del álbum"
          className="h-40 w-40 rounded-xl bg-white p-2 shadow-sm"
        />
      )}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 className="font-semibold">Comparte este álbum</h2>
        <p className="mt-1 text-sm text-tinta/60">
          Tus invitados solo tienen que escanear el QR o abrir el enlace. No
          necesitan instalar nada ni crear cuenta.
        </p>
        <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row">
          <code className="w-full truncate rounded-lg border border-tinta/15 bg-white px-3 py-2 text-sm">
            {shareUrl}
          </code>
          <button
            onClick={copy}
            className="shrink-0 rounded-lg bg-teja px-4 py-2 text-sm font-semibold text-white transition hover:bg-teja-oscuro"
          >
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
        {qr && (
          <a
            href={qr}
            download="qr-album.png"
            className="mt-2 inline-block text-sm text-teja hover:underline"
          >
            Descargar el QR como imagen
          </a>
        )}
      </div>
    </section>
  );
}
