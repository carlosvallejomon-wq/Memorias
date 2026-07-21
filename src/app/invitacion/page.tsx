"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  TEMPLATES,
  renderInvitation,
  loadImage,
  ensureInvitationFonts,
  decodeInvitationLink,
  type InvitationData,
} from "@/components/InvitationGenerator";

function InvitationView() {
  const params = useSearchParams();
  const raw = params.get("d");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!raw) {
      setError("Este enlace de invitación no es válido.");
      return;
    }
    const state = decodeInvitationLink(raw);
    if (!state) {
      setError("Este enlace de invitación no es válido.");
      return;
    }
    const template = TEMPLATES.find((t) => t.id === state.t);
    if (!template) {
      setError("Esta invitación usa un diseño que ya no está disponible.");
      return;
    }

    let cancelled = false;
    (async () => {
      await ensureInvitationFonts();
      const [qrImg, bgImg] = await Promise.all([
        QRCode.toDataURL(state.u, { margin: 1, width: 480 }).then(loadImage),
        template.bgImage ? loadImage(template.bgImage) : Promise.resolve(null),
      ]);
      if (cancelled) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = template.canvasW;
      canvas.height = template.canvasH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const data: InvitationData = {
        albumName: state.n,
        eventDateLabel: state.d ?? null,
        time: state.h ?? "",
        location: state.l ?? "",
        hosts: state.o ?? "",
        rsvp: state.r ?? "",
        shareUrl: state.u,
      };
      renderInvitation(ctx, template, data, state.tx, state.q, null, bgImg, qrImg, null, null);
      setShareUrl(state.u);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [raw]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arena p-6 text-center text-tinta/70">
        {error}
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-5 bg-arena p-6">
      {!ready && <p className="text-sm text-tinta/50">Cargando invitación…</p>}
      <canvas
        ref={canvasRef}
        className={`w-full max-w-md rounded-2xl shadow-lift ${ready ? "" : "hidden"}`}
      />
      {ready && shareUrl && (
        <a
          href={shareUrl}
          className="shimmer flex items-center gap-2 rounded-full bg-teja px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
        >
          Ver álbum de fotos
        </a>
      )}
    </div>
  );
}

export default function InvitacionPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-arena text-sm text-tinta/50">
          Cargando…
        </div>
      }
    >
      <InvitationView />
    </Suspense>
  );
}
