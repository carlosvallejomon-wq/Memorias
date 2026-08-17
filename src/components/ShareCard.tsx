"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy, Download, QrCode, Send, Sparkles, Upload } from "lucide-react";

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
    <section className="glass mt-6 flex flex-col items-center gap-5 rounded-2xl p-5 sm:flex-row">
      {qr && (
         
        <img
          src={qr}
          alt="Código QR del álbum"
          className="h-40 w-40 rounded-xl bg-white p-2 shadow-lift"
        />
      )}
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <h2 className="flex items-center justify-center gap-2 font-semibold sm:justify-start">
          <Sparkles size={16} className="text-teja" /> Comparte este álbum
        </h2>
        <p className="mt-1 text-sm text-tinta/60">
          Tus invitados solo tienen que escanear el QR o abrir el enlace. No
          necesitan instalar nada ni crear cuenta.
        </p>
        <div className="mt-3 flex flex-col items-center gap-2 sm:flex-row">
          <code className="w-full truncate rounded-lg border border-tinta/15 bg-white/80 px-3 py-2 text-sm">
            {shareUrl}
          </code>
          <button
            onClick={copy}
            className="shimmer flex shrink-0 items-center gap-1.5 rounded-lg bg-teja px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "¡Copiado!" : "Copiar enlace"}
          </button>
        </div>
        {qr && (
          <a
            href={qr}
            download="qr-album.png"
            className="mt-2 inline-flex items-center gap-1 text-sm text-teja hover:underline"
          >
            <Download size={14} /> Descargar el QR como imagen
          </a>
        )}
        <ol className="mt-4 grid gap-2 border-t border-tinta/10 pt-4 text-center sm:grid-cols-3 sm:text-left">
          {[
            { icon: Copy, text: "Copia el enlace" },
            { icon: Send, text: "Envíalo por WhatsApp" },
            { icon: Upload, text: "Ellos suben sus recuerdos" },
          ].map(({ icon: Icon, text }, index) => (
            <li key={text} className="flex items-center justify-center gap-2 text-xs font-medium text-tinta/65 sm:justify-start">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-arena text-teja">
                {index === 0 ? <QrCode size={13} /> : <Icon size={13} />}
              </span>
              <span>{text}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
