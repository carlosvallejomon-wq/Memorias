"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import QRCode from "qrcode";
import {
  TEMPLATES,
  renderInvitation,
  defaultDetailsLayout,
  loadImage,
  ensureInvitationFonts,
  decodeInvitationLink,
  type InvitationData,
} from "@/components/InvitationGenerator";

function InvitationView() {
  const params = useSearchParams();
  const raw = params.get("d");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);

  const invitation = useMemo(() => {
    if (!raw) return { error: "Este enlace de invitación no es válido." } as const;
    const state = decodeInvitationLink(raw);
    if (!state) return { error: "Este enlace de invitación no es válido." } as const;
    const template = TEMPLATES.find((candidate) => candidate.id === state.t);
    if (!template) {
      return { error: "Esta invitación usa un diseño que ya no está disponible." } as const;
    }
    return { state, template, error: null } as const;
  }, [raw]);

  useEffect(() => {
    if (invitation.error) return;
    const { state, template } = invitation;

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
      // Los enlaces creados antes de separar el bloque de datos no traen `dx`:
      // en ese caso se coloca justo debajo del título, como estaba.
      renderInvitation(
        ctx,
        template,
        data,
        state.tx,
        state.dx ?? defaultDetailsLayout(state.tx),
        state.q,
        null,
        bgImg,
        qrImg,
        null,
        null,
      );
      setShareUrl(state.u);
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [invitation]);

  if (invitation.error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-arena p-6 text-center text-tinta/70">
        {invitation.error}
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
