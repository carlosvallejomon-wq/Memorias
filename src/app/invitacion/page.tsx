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

function visualTheme(style?: "quince" | "boda" | "baby") {
  if (style === "boda") return {
    name: "Boda editorial", accent: "#a77a55", ink: "#3c3029", paper: "#fbf8f2", blush: "#eee4d6",
    hero: "linear-gradient(180deg, rgba(25,31,29,.14), rgba(40,31,26,.82))", ornament: "❦",
  };
  if (style === "baby") return {
    name: "Baby shower delicado", accent: "#758f84", ink: "#3e534b", paper: "#fcfaf3", blush: "#e4eee8",
    hero: "linear-gradient(180deg, rgba(75,96,87,.12), rgba(45,70,59,.78))", ornament: "✿",
  };
  return {
    name: "Quinceañera romántica", accent: "#b65d7a", ink: "#542d3a", paper: "#fff8fa", blush: "#f6dfe7",
    hero: "linear-gradient(180deg, rgba(76,31,46,.1), rgba(79,27,45,.82))", ornament: "✦",
  };
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
  const [openedInteractiveInvitation, setOpenedInteractiveInvitation] = useState(false);
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
  const theme = visualTheme(state.iv);
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
    <div className={interactive ? "min-h-screen text-tinta" : "flex min-h-screen flex-col items-center justify-center gap-5 bg-arena p-6"} style={interactive ? { backgroundColor: theme.paper } : undefined}>
      {!ready && <p className="p-6 text-center text-sm text-tinta/50">Cargando invitación…</p>}
      <canvas ref={canvasRef} className={interactive ? "hidden" : `w-full max-w-md rounded-2xl shadow-lift ${ready ? "" : "hidden"}`} />
      {ready && shareUrl && (interactive ? (
        !openedInteractiveInvitation ? (
          <main className="mx-auto flex min-h-screen max-w-md flex-col overflow-hidden text-white shadow-lift" style={{ backgroundColor: theme.ink }}>
            <section className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden px-7 pb-14 text-center" style={{ backgroundImage: `${theme.hero}, url(${template.bgImage ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }}>
              <div className="absolute inset-5 rounded-[2rem] border border-white/45" />
              <div className="absolute inset-x-0 top-0 h-44 bg-gradient-to-b from-black/30 to-transparent" />
              <span className="absolute left-8 top-9 text-3xl text-white/70">{theme.ornament}</span><span className="absolute right-8 top-9 text-3xl text-white/70">{theme.ornament}</span>
              <div className="relative animate-fade-in">
                <p className="text-[11px] font-semibold uppercase tracking-[.34em] text-white/75">{theme.name}</p>
                <p className="mt-8 text-sm italic text-white/85">Con mucha alegría te invitamos a</p>
                <h1 className="mt-3 text-6xl leading-[.9] drop-shadow-md" style={{ fontFamily: "var(--font-display)" }}>{state.n}</h1>
                {state.d && <p className="mt-7 text-sm uppercase tracking-[.18em] text-white/90">{state.d}</p>}
                <button onClick={() => setOpenedInteractiveInvitation(true)} className="shimmer mt-10 rounded-full border border-white/75 bg-white/15 px-7 py-3 text-sm font-semibold tracking-wide backdrop-blur transition hover:bg-white hover:text-tinta">Ver los detalles</button>
              </div>
            </section>
          </main>
        ) : (
        <main className="mx-auto max-w-md overflow-hidden shadow-lift" style={{ backgroundColor: theme.paper }}>
          <section className="relative flex min-h-[560px] flex-col items-center justify-end overflow-hidden px-7 pb-12 text-center text-white" style={{ backgroundImage: `${theme.hero}, url(${template.bgImage ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" }}>
            <button onClick={() => setOpenedInteractiveInvitation(false)} className="absolute left-5 top-5 z-10 rounded-full border border-white/45 bg-black/15 px-3 py-2 text-xs font-semibold backdrop-blur">← Portada</button>
            <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/35 to-transparent" />
            <div className="relative animate-fade-in">
              <p className="text-xs font-semibold uppercase tracking-[.28em] text-white/85">Estás invitado a celebrar</p>
              <h1 className="mt-3 text-5xl leading-none drop-shadow-sm" style={{ fontFamily: "var(--font-display)" }}>{state.n}</h1>
              {state.o && <p className="mt-4 text-sm text-white/90">{state.o}</p>}
              <span className="mt-7 inline-block rounded-full border border-white/60 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur">Desliza para descubrir</span>
            </div>
          </section>

          <section className="relative overflow-hidden px-7 py-11 text-center" style={{ color: theme.ink }}>
            <span className="absolute -left-3 -top-4 text-7xl opacity-10">{theme.ornament}</span><span className="absolute -bottom-5 -right-2 text-8xl opacity-10">{theme.ornament}</span>
            <p className="text-xs font-semibold uppercase tracking-[.23em]" style={{ color: theme.accent }}>Nuestro gran día</p>
            <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.d || "Muy pronto"}</h2>
            {state.h && <p className="mt-2 text-base text-tinta/70">{state.h}</p>}
            {countdown && <div className="mt-7 rounded-2xl px-5 py-5 text-white" style={{ backgroundColor: theme.ink }}><p className="text-xs uppercase tracking-[.2em] text-white/65">Faltan</p><p className="mt-2 text-2xl font-semibold">{countdown}</p></div>}
          </section>

          <section className="border-y border-tinta/10 px-7 py-10 text-center" style={{ backgroundColor: theme.blush, color: theme.ink }}>
            <p className="text-xs font-semibold uppercase tracking-[.23em]" style={{ color: theme.accent }}>Fecha y lugar</p>
            {state.l && <p className="mx-auto mt-4 max-w-xs text-lg leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>{state.l}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {state.mp && <a href={state.mp} target="_blank" rel="noreferrer" className="rounded-full px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>Abrir ubicación</a>}
              {calendarUrl && <a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-full border border-tinta/20 bg-white px-5 py-3 text-sm font-semibold text-tinta">Agregar al calendario</a>}
            </div>
          </section>

          {state.dr && <section className="px-7 py-11 text-center" style={{ color: theme.ink }}><p className="text-xs font-semibold uppercase tracking-[.23em]" style={{ color: theme.accent }}>Código de vestimenta</p><h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.dr}</h2><div className="mx-auto mt-6 flex w-40 justify-center gap-3"><span className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.accent }} /><span className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.blush }} /><span className="h-8 w-8 rounded-full" style={{ backgroundColor: theme.ink }} /></div></section>}

          {timeline.length > 0 && <section className="px-7 py-11 text-white" style={{ backgroundColor: theme.ink }}><p className="text-center text-xs font-semibold uppercase tracking-[.23em] text-white/60">La celebración</p><h2 className="mt-3 text-center text-3xl" style={{ fontFamily: "var(--font-display)" }}>Nuestra cronología</h2><div className="mt-7 grid gap-3">{timeline.map((item, index) => <p key={`${item}-${index}`} className="border-l pl-4 text-sm leading-relaxed text-white/90" style={{ borderColor: theme.accent }}>{item}</p>)}</div></section>}

          <section className="grid gap-5 px-7 py-11">
            {state.ms && <audio controls className="w-full"><source src={state.ms} />Tu navegador no puede reproducir esta canción.</audio>}
            {rsvpForm}
            <a href={shareUrl} className="shimmer block rounded-full px-6 py-3 text-center font-semibold text-white shadow-soft" style={{ backgroundColor: theme.accent }}>Ver álbum de fotos</a>
          </section>
          <p className="pb-8 text-center text-xs text-tinta/40">Memorias Vivas</p>
        </main>
        )
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
