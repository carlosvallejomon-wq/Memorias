"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
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
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpAttending, setRsvpAttending] = useState(true);
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpState, setRsvpState] = useState<"idle" | "sending" | "sent" | "error">("idle");

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

  async function sendRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (invitation.error) return;
    const code = new URL(invitation.state.u).pathname.match(/^\/a\/([^/]+)/)?.[1];
    if (!code) {
      setRsvpState("error");
      return;
    }
    setRsvpState("sending");
    try {
      const response = await fetch(`/api/invitaciones/${encodeURIComponent(code)}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: rsvpName,
          attending: rsvpAttending,
          partySize: rsvpAttending ? rsvpGuests : 0,
          note: rsvpNote,
        }),
      });
      if (!response.ok) throw new Error("No se pudo guardar");
      setRsvpState("sent");
    } catch {
      setRsvpState("error");
    }
  }

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
        <>
          {invitation.state.ar && (
            <form onSubmit={sendRsvp} className="w-full max-w-md rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft">
              <p className="text-center text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>Confirma tu asistencia</p>
              {rsvpState === "sent" ? (
                <p className="mt-3 rounded-xl bg-teja/10 p-3 text-center text-sm text-teja-oscuro">¡Gracias! Tu respuesta fue enviada.</p>
              ) : (
                <div className="mt-4 grid gap-3">
                  <input required value={rsvpName} onChange={(e) => setRsvpName(e.target.value)} maxLength={100} placeholder="Tu nombre" className="rounded-xl border border-tinta/15 px-3 py-2.5 text-sm outline-none focus:border-teja" />
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <button type="button" onClick={() => setRsvpAttending(true)} className={`rounded-xl border px-3 py-2 ${rsvpAttending ? "border-teja bg-teja text-white" : "border-tinta/15"}`}>Sí, asistiré</button>
                    <button type="button" onClick={() => setRsvpAttending(false)} className={`rounded-xl border px-3 py-2 ${!rsvpAttending ? "border-tinta bg-tinta text-white" : "border-tinta/15"}`}>No podré asistir</button>
                  </div>
                  {rsvpAttending && <label className="text-sm text-tinta/70">Personas en tu grupo<input type="number" min="1" max="20" value={rsvpGuests} onChange={(e) => setRsvpGuests(Math.max(1, Number(e.target.value) || 1))} className="mt-1 block w-full rounded-xl border border-tinta/15 px-3 py-2" /></label>}
                  <input value={rsvpNote} onChange={(e) => setRsvpNote(e.target.value)} maxLength={300} placeholder="Mensaje opcional" className="rounded-xl border border-tinta/15 px-3 py-2.5 text-sm outline-none focus:border-teja" />
                  <button disabled={rsvpState === "sending"} className="rounded-xl bg-teja px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{rsvpState === "sending" ? "Enviando…" : "Enviar confirmación"}</button>
                  {rsvpState === "error" && <p className="text-center text-xs text-vino">No se pudo enviar. Inténtalo de nuevo.</p>}
                </div>
              )}
            </form>
          )}
          <a href={shareUrl} className="shimmer flex items-center gap-2 rounded-full bg-teja px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro">Ver álbum de fotos</a>
        </>
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
