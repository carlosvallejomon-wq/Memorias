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

function countdownLabel(startsAt?: string) {
  if (!startsAt) return null;
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return null;
  const remaining = target - Date.now();
  if (remaining <= 0) return "¡El gran día ha llegado!";
  const days = Math.floor(remaining / 86_400_000);
  const hours = Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  return `${days} días · ${hours} h · ${minutes} min`;
}

function googleCalendarUrl(state: { n: string; st?: string; l?: string }) {
  if (!state.st) return null;
  const start = new Date(state.st);
  if (Number.isNaN(start.getTime())) return null;
  const end = new Date(start.getTime() + 3 * 60 * 60 * 1000);
  const format = (date: Date) => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const params = new URLSearchParams({ action: "TEMPLATE", text: state.n, dates: `${format(start)}/${format(end)}`, location: state.l ?? "" });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

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
  const [, setClock] = useState(0);

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
    if (invitation.error || !invitation.state.it || !invitation.state.st) return;
    const interval = window.setInterval(() => setClock((value) => value + 1), 30_000);
    return () => window.clearInterval(interval);
  }, [invitation]);

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

  const { state, template } = invitation;
  const interactive = Boolean(state.it);
  const countdown = countdownLabel(state.st);
  const calendarUrl = googleCalendarUrl(state);
  const timeline = (state.tl ?? "").split("\n").map((item) => item.trim()).filter(Boolean);

  const rsvpForm = state.ar && (
    <form onSubmit={sendRsvp} className="rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lift">
      <p className="text-center text-xl font-semibold text-tinta" style={{ fontFamily: "var(--font-display)" }}>Confirma tu asistencia</p>
      <p className="mt-1 text-center text-sm text-tinta/60">Nos encantará celebrar contigo.</p>
      {rsvpState === "sent" ? (
        <p className="mt-4 rounded-2xl bg-teja/10 p-4 text-center text-sm text-teja-oscuro">¡Gracias! Tu respuesta fue enviada.</p>
      ) : (
        <div className="mt-4 grid gap-3">
          <input required value={rsvpName} onChange={(e) => setRsvpName(e.target.value)} maxLength={100} placeholder="Tu nombre" className="rounded-xl border border-tinta/15 px-3 py-2.5 text-sm outline-none focus:border-teja" />
          <div className="grid grid-cols-2 gap-2 text-sm">
            <button type="button" onClick={() => setRsvpAttending(true)} className={`rounded-xl border px-3 py-2.5 ${rsvpAttending ? "border-teja bg-teja text-white" : "border-tinta/15 bg-white"}`}>Sí, asistiré</button>
            <button type="button" onClick={() => setRsvpAttending(false)} className={`rounded-xl border px-3 py-2.5 ${!rsvpAttending ? "border-tinta bg-tinta text-white" : "border-tinta/15 bg-white"}`}>No podré asistir</button>
          </div>
          {rsvpAttending && <label className="text-sm text-tinta/70">Personas en tu grupo<input type="number" min="1" max="20" value={rsvpGuests} onChange={(e) => setRsvpGuests(Math.max(1, Number(e.target.value) || 1))} className="mt-1 block w-full rounded-xl border border-tinta/15 px-3 py-2" /></label>}
          <input value={rsvpNote} onChange={(e) => setRsvpNote(e.target.value)} maxLength={300} placeholder="Mensaje opcional" className="rounded-xl border border-tinta/15 px-3 py-2.5 text-sm outline-none focus:border-teja" />
          <button disabled={rsvpState === "sending"} className="rounded-xl bg-teja px-4 py-3 text-sm font-semibold text-white disabled:opacity-60">{rsvpState === "sending" ? "Enviando…" : "Enviar confirmación"}</button>
          {rsvpState === "error" && <p className="text-center text-xs text-vino">No se pudo enviar. Inténtalo de nuevo.</p>}
        </div>
      )}
    </form>
  );

  return (
    <div className={interactive ? "min-h-screen bg-[#f7f1ed] text-tinta" : "flex min-h-screen flex-col items-center justify-center gap-5 bg-arena p-6"}>
      {!ready && <p className="p-6 text-center text-sm text-tinta/50">Cargando invitación…</p>}
      <canvas ref={canvasRef} className={interactive ? "hidden" : `w-full max-w-md rounded-2xl shadow-lift ${ready ? "" : "hidden"}`} />
      {ready && shareUrl && (interactive ? (
        <main className="mx-auto max-w-md overflow-hidden bg-[#fffaf7] shadow-lift">
          <section className="relative flex min-h-[560px] flex-col items-center justify-end overflow-hidden px-7 pb-12 text-center text-white" style={{ backgroundImage: `linear-gradient(180deg, rgba(35,24,20,.18), rgba(35,24,20,.75)), url(${template.bgImage ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
            <p className="relative text-xs font-semibold uppercase tracking-[.28em] text-white/85">Estás invitado a celebrar</p>
            <h1 className="relative mt-3 text-5xl leading-none drop-shadow-sm" style={{ fontFamily: "var(--font-display)" }}>{state.n}</h1>
            {state.o && <p className="relative mt-4 text-sm text-white/90">{state.o}</p>}
            <span className="relative mt-7 rounded-full border border-white/60 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur">Desliza para descubrir</span>
          </section>

          <section className="px-7 py-11 text-center">
            <p className="text-xs font-semibold uppercase tracking-[.23em] text-teja">Nuestro gran día</p>
            <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.d || "Muy pronto"}</h2>
            {state.h && <p className="mt-2 text-base text-tinta/70">{state.h}</p>}
            {countdown && <div className="mt-7 rounded-2xl bg-tinta px-5 py-5 text-white"><p className="text-xs uppercase tracking-[.2em] text-white/65">Faltan</p><p className="mt-2 text-2xl font-semibold">{countdown}</p></div>}
          </section>

          <section className="border-y border-tinta/10 bg-[#f1e2d9] px-7 py-10 text-center">
            <p className="text-xs font-semibold uppercase tracking-[.23em] text-vino">Fecha y lugar</p>
            {state.l && <p className="mx-auto mt-4 max-w-xs text-lg leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>{state.l}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {state.mp && <a href={state.mp} target="_blank" rel="noreferrer" className="rounded-full bg-teja px-5 py-3 text-sm font-semibold text-white">Abrir ubicación</a>}
              {calendarUrl && <a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-full border border-tinta/20 bg-white px-5 py-3 text-sm font-semibold text-tinta">Agregar al calendario</a>}
            </div>
          </section>

          {state.dr && <section className="px-7 py-11 text-center"><p className="text-xs font-semibold uppercase tracking-[.23em] text-teja">Código de vestimenta</p><h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.dr}</h2><div className="mx-auto mt-6 flex w-40 justify-center gap-3"><span className="h-8 w-8 rounded-full bg-[#d7ad83]" /><span className="h-8 w-8 rounded-full bg-[#8b6772]" /><span className="h-8 w-8 rounded-full bg-[#3e4b46]" /></div></section>}

          {timeline.length > 0 && <section className="bg-[#3b2924] px-7 py-11 text-white"><p className="text-center text-xs font-semibold uppercase tracking-[.23em] text-white/60">La celebración</p><h2 className="mt-3 text-center text-3xl" style={{ fontFamily: "var(--font-display)" }}>Nuestra cronología</h2><div className="mt-7 grid gap-3">{timeline.map((item, index) => <p key={`${item}-${index}`} className="border-l border-[#d7ad83] pl-4 text-sm leading-relaxed text-white/90">{item}</p>)}</div></section>}

          <section className="grid gap-5 px-7 py-11">
            {state.ms && <audio controls className="w-full"><source src={state.ms} />Tu navegador no puede reproducir esta canción.</audio>}
            {rsvpForm}
            <a href={shareUrl} className="shimmer block rounded-full bg-teja px-6 py-3 text-center font-semibold text-white shadow-soft">Ver álbum de fotos</a>
          </section>
          <p className="pb-8 text-center text-xs text-tinta/40">Memorias Vivas</p>
        </main>
      ) : (
        <>
          {rsvpForm}
          <a href={shareUrl} className="shimmer flex items-center gap-2 rounded-full bg-teja px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro">Ver álbum de fotos</a>
        </>
      ))}
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
