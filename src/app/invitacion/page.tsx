"use client";

import { FormEvent, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Music, Pause } from "lucide-react";
import QRCode from "qrcode";
import { Reveal } from "@/components/Reveal";
import {
  TEMPLATES,
  renderInvitation,
  defaultDetailsLayout,
  loadImage,
  ensureInvitationFonts,
  decodeInvitationLink,
  type InvitationData,
} from "@/components/InvitationGenerator";

type CountdownPart = { label: string; value: number };

// La cuenta atrás se pinta en cuatro cajas (días, horas, minutos, segundos)
// en vez de una frase: es lo que la gente espera de una invitación web y se
// lee de un vistazo en el móvil.
function countdownParts(startsAt?: string): CountdownPart[] | "llegó" | null {
  if (!startsAt) return null;
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return null;
  const remaining = target - Date.now();
  if (remaining <= 0) return "llegó";
  return [
    { label: "Días", value: Math.floor(remaining / 86_400_000) },
    { label: "Horas", value: Math.floor((remaining % 86_400_000) / 3_600_000) },
    { label: "Min", value: Math.floor((remaining % 3_600_000) / 60_000) },
    { label: "Seg", value: Math.floor((remaining % 60_000) / 1_000) },
  ];
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

/** Código del álbum dentro del enlace público (`/a/xxxx`). */
function albumCodeFrom(shareUrl: string): string | null {
  try {
    return new URL(shareUrl).pathname.match(/^\/a\/([^/]+)/)?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Iniciales para el lacre: las que ponga el organizador o, si no, las del
 *  nombre del evento. */
function sealInitials(state: { si?: string; n: string }): string {
  const manual = (state.si ?? "").trim();
  if (manual) return manual.slice(0, 4).toUpperCase();
  const words = state.n.split(/\s+/).filter((w) => w.length > 2);
  return (words.slice(0, 2).map((w) => w[0]).join("") || state.n.slice(0, 2)).toUpperCase();
}

// Nombres de color en castellano, para que el organizador pueda escribir
// "vino, beige" en vez de buscar códigos hexadecimales. Lo que no esté aquí
// se pasa tal cual al navegador (un `#a1b2c3` funciona igual), y como el
// nombre siempre se imprime debajo del círculo, un color desconocido se
// queda en un círculo vacío pero se sigue entendiendo.
const COLORES: Record<string, string> = {
  blanco: "#ffffff", marfil: "#f6f1e3", crema: "#f3ead7", beige: "#e8dcc8", arena: "#e3d6c0",
  nude: "#e3c3ad", durazno: "#f0b99a", salmon: "#ee9c86", coral: "#e8836f", naranja: "#d98032",
  terracota: "#b5623c", cafe: "#6b4b34", marron: "#6b4b34", dorado: "#c9a227", oro: "#c9a227",
  amarillo: "#e9c46a", mostaza: "#d3a625", verde: "#4b7a52", olivo: "#6b7a4b", menta: "#b8ddc9",
  turquesa: "#4bab9e", celeste: "#a8cbe4", azul: "#2f5d8c", marino: "#25395c", lavanda: "#cfc3e6",
  lila: "#b9a3d1", morado: "#6a4a7a", fucsia: "#c2306e", rosa: "#e79ab4", rosado: "#e79ab4",
  palo: "#e2b8b3", rojo: "#c0392b", vino: "#6b2737", gris: "#9aa0a6", plata: "#c0c4c9",
  plateado: "#c0c4c9", negro: "#111111", tinta: "#2f2a26",
};

function colorList(value?: string): { label: string; color: string }[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label) => {
      const clave = label
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z#0-9]/g, "");
      return { label, color: COLORES[clave] ?? label };
    });
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

type Recuerdo = { id: string; url: string; type: string; posterUrl: string | null };
type Deseo = { id: string; authorName: string | null; body: string };

function InvitationView() {
  const params = useSearchParams();
  const raw = params.get("d");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const musicRef = useRef<HTMLAudioElement>(null);
  const [ready, setReady] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [rsvpName, setRsvpName] = useState("");
  const [rsvpAttending, setRsvpAttending] = useState(true);
  const [rsvpGuests, setRsvpGuests] = useState(1);
  const [rsvpNote, setRsvpNote] = useState("");
  const [rsvpState, setRsvpState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  // El sobre pasa por tres momentos: cerrado, abriéndose (mientras dura la
  // animación del lacre y la solapa) y abierto.
  const [sobre, setSobre] = useState<"cerrado" | "abriendo" | "abierto">("cerrado");
  const [musicaSonando, setMusicaSonando] = useState(false);
  const [recuerdos, setRecuerdos] = useState<Recuerdo[]>([]);
  const [deseos, setDeseos] = useState<Deseo[]>([]);
  const [deseoNombre, setDeseoNombre] = useState("");
  const [deseoTexto, setDeseoTexto] = useState("");
  const [deseoEstado, setDeseoEstado] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [hashtagCopiado, setHashtagCopiado] = useState(false);
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

  const albumCode = invitation.error ? null : albumCodeFrom(invitation.state.u);

  // La cuenta atrás lleva segundos, así que se refresca cada segundo. Solo
  // mientras la invitación está abierta: con el sobre cerrado no se ve.
  useEffect(() => {
    if (invitation.error || !invitation.state.it || !invitation.state.st) return;
    if (sobre !== "abierto") return;
    const interval = window.setInterval(() => setClock((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [invitation, sobre]);

  // Fotos del álbum y buenos deseos ya escritos. Se piden al abrir el sobre
  // para no gastar datos de quien solo mira la portada. Si el álbum tiene
  // código de acceso el servidor responde 403 y las secciones no aparecen.
  useEffect(() => {
    if (invitation.error || sobre !== "abierto" || !albumCode) return;
    const { state } = invitation;
    let cancelled = false;
    if (state.ga) {
      fetch(`/api/guest/${encodeURIComponent(albumCode)}/media`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: Recuerdo[] } | null) => {
          if (cancelled || !data?.items) return;
          setRecuerdos(data.items.filter((item) => item.type === "image" || item.posterUrl).slice(0, 6));
        })
        .catch(() => {});
    }
    if (state.bd) {
      fetch(`/api/guest/${encodeURIComponent(albumCode)}/guestbook`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { items?: Deseo[] } | null) => {
          if (cancelled || !data?.items) return;
          setDeseos(data.items.slice(0, 3));
        })
        .catch(() => {});
    }
    return () => {
      cancelled = true;
    };
  }, [invitation, sobre, albumCode]);

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
    if (!albumCode) {
      setRsvpState("error");
      return;
    }
    setRsvpState("sending");
    try {
      const response = await fetch(`/api/invitaciones/${encodeURIComponent(albumCode)}/rsvp`, {
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

  // Los buenos deseos van al mismo muro de mensajes del álbum, así que
  // acaban impresos en las páginas de dedicatorias del Dotbook sin que el
  // organizador tenga que copiar nada.
  async function sendDeseo(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!albumCode) {
      setDeseoEstado("error");
      return;
    }
    setDeseoEstado("sending");
    try {
      let guestId = localStorage.getItem("mv_guest_id") ?? "";
      if (!guestId) {
        guestId = crypto.randomUUID();
        localStorage.setItem("mv_guest_id", guestId);
      }
      if (deseoNombre.trim()) localStorage.setItem("mv_guest_name", deseoNombre.trim());
      const response = await fetch(`/api/guest/${encodeURIComponent(albumCode)}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: deseoNombre.trim() || null, guestId, body: deseoTexto }),
      });
      if (!response.ok) throw new Error("No se pudo guardar");
      const data = (await response.json()) as { item?: Deseo };
      if (data.item) setDeseos((previos) => [data.item as Deseo, ...previos].slice(0, 3));
      setDeseoEstado("sent");
    } catch {
      setDeseoEstado("error");
    }
  }

  function abrirSobre() {
    if (sobre !== "cerrado") return;
    setSobre("abriendo");
    // El toque del invitado es el permiso que pide el navegador para sonar:
    // si la música se intentara antes, quedaría bloqueada en silencio.
    const audio = musicRef.current;
    if (audio) {
      audio
        .play()
        .then(() => setMusicaSonando(true))
        .catch(() => {});
    }
    window.setTimeout(() => setSobre("abierto"), 1200);
  }

  function alternarMusica() {
    const audio = musicRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().then(() => setMusicaSonando(true)).catch(() => {});
    } else {
      audio.pause();
      setMusicaSonando(false);
    }
  }

  async function copiarHashtag(hashtag: string) {
    try {
      await navigator.clipboard.writeText(`#${hashtag}`);
      setHashtagCopiado(true);
      window.setTimeout(() => setHashtagCopiado(false), 2000);
    } catch {
      // Sin portapapeles (navegadores antiguos) el hashtag se ve igual y se
      // puede copiar a mano; no merece un aviso de error.
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
  const cuenta = countdownParts(state.st);
  const calendarUrl = googleCalendarUrl(state);
  const timeline = (state.tl ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const avisos = (state.av ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const paleta = colorList(state.pa);
  const evitar = colorList(state.ev);
  // Las plantillas van de casi blancas a casi negras, y encima de las claras
  // el texto blanco no se leía: además del degradado del tema se pone un velo
  // oscuro fijo, que es lo que garantiza el contraste con cualquiera de ellas.
  const velo = "linear-gradient(180deg, rgba(18,10,14,.46), rgba(18,10,14,.24) 38%, rgba(18,10,14,.8))";
  const fondo = { backgroundImage: `${velo}, ${theme.hero}, url(${template.bgImage ?? ""})`, backgroundSize: "cover", backgroundPosition: "center" };
  const rotulo = "text-xs font-semibold uppercase tracking-[.23em]";

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
      {interactive && state.ms && <audio ref={musicRef} src={state.ms} loop preload="none" className="hidden" />}
      {ready && shareUrl && (interactive ? (
        sobre !== "abierto" ? (
          <main className={`sobre mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-14 text-center text-white ${sobre === "abriendo" ? "sobre-abriendo" : ""}`} style={fondo}>
            <p className={`${rotulo} text-white/75`}>{theme.name}</p>
            <p className="mt-4 text-sm italic text-white/85">Tienes una invitación</p>

            <button
              type="button"
              onClick={abrirSobre}
              aria-label={`Abrir la invitación de ${state.n}`}
              className="sobre-cuerpo relative mt-9 aspect-[7/5] w-full max-w-sm rounded-2xl shadow-lift"
              style={{ backgroundColor: theme.paper }}
            >
              {/* Bolsillo del sobre: el triángulo que sube desde la base. */}
              <span className="absolute inset-0 rounded-2xl" style={{ backgroundColor: theme.blush, clipPath: "polygon(0 100%, 50% 40%, 100% 100%)" }} />
              <span className="absolute inset-0 rounded-2xl border border-black/10" />
              {/* Solapa: gira sobre su borde de arriba al romperse el lacre. */}
              <span className="sobre-solapa absolute inset-x-0 top-0 h-[62%]" style={{ backgroundColor: theme.blush, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              <span className="lacre absolute left-1/2 top-1/2 z-10 flex h-20 w-20 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-xl font-semibold tracking-wide text-white shadow-lift" style={{ backgroundColor: theme.accent, fontFamily: "var(--font-display)" }}>
                {sealInitials(state)}
              </span>
            </button>

            <p className="mt-9 text-3xl leading-tight drop-shadow-md" style={{ fontFamily: "var(--font-display)" }}>{state.n}</p>
            {state.d && <p className="mt-3 text-sm uppercase tracking-[.18em] text-white/90">{state.d}</p>}
            <p className="mt-8 animate-pulse text-sm text-white/85">Toca el sobre para abrirlo</p>
          </main>
        ) : (
        <main className="mx-auto max-w-md overflow-hidden shadow-lift" style={{ backgroundColor: theme.paper }}>
          <section className="marco-doble relative flex min-h-screen flex-col items-center justify-end overflow-hidden px-9 pb-14 text-center text-white animate-fade-in" style={fondo}>
            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
            <span className="absolute left-9 top-11 text-3xl text-white/70">{theme.ornament}</span>
            <span className="absolute right-9 top-11 text-3xl text-white/70">{theme.ornament}</span>
            <div className="relative">
              <p className={`${rotulo} text-white/85`}>Estás invitado a celebrar</p>
              <h1 className="mt-4 text-5xl leading-none drop-shadow-sm" style={{ fontFamily: "var(--font-display)" }}>{state.n}</h1>
              {state.o && <p className="mt-4 text-sm text-white/90">{state.o}</p>}
              <span className="mt-8 inline-block rounded-full border border-white/60 bg-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[.16em] backdrop-blur">Desliza para descubrir</span>
            </div>
          </section>

          <Reveal>
            <section className="relative overflow-hidden px-7 py-11 text-center" style={{ color: theme.ink }}>
              <span className="absolute -left-3 -top-4 text-7xl opacity-10">{theme.ornament}</span>
              <span className="absolute -bottom-5 -right-2 text-8xl opacity-10">{theme.ornament}</span>
              <p className={rotulo} style={{ color: theme.accent }}>Nuestro gran día</p>
              <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.d || "Muy pronto"}</h2>
              {state.h && <p className="mt-2 text-base text-tinta/70">{state.h}</p>}
              {cuenta === "llegó" && <p className="mt-7 rounded-2xl px-5 py-5 text-lg font-semibold text-white" style={{ backgroundColor: theme.ink }}>¡El gran día ha llegado!</p>}
              {Array.isArray(cuenta) && (
                <div className="mt-7 grid grid-cols-4 gap-2">
                  {cuenta.map((parte) => (
                    <div key={parte.label} className="rounded-2xl px-1 py-4 text-white" style={{ backgroundColor: theme.ink }}>
                      <p className="text-2xl font-semibold tabular-nums">{String(parte.value).padStart(2, "0")}</p>
                      <p className="mt-1 text-[10px] uppercase tracking-[.14em] text-white/65">{parte.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </Reveal>

          <Reveal>
            <section className="border-y border-tinta/10 px-7 py-10 text-center" style={{ backgroundColor: theme.blush, color: theme.ink }}>
              <p className={rotulo} style={{ color: theme.accent }}>Fecha y lugar</p>
              {state.l && <p className="mx-auto mt-4 max-w-xs text-lg leading-relaxed" style={{ fontFamily: "var(--font-display)" }}>{state.l}</p>}
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {state.mp && <a href={state.mp} target="_blank" rel="noreferrer" className="rounded-full px-5 py-3 text-sm font-semibold text-white" style={{ backgroundColor: theme.accent }}>Abrir ubicación</a>}
                {calendarUrl && <a href={calendarUrl} target="_blank" rel="noreferrer" className="rounded-full border border-tinta/20 bg-white px-5 py-3 text-sm font-semibold text-tinta">Agregar al calendario</a>}
              </div>
            </section>
          </Reveal>

          {timeline.length > 0 && (
            <Reveal>
              <section className="px-7 py-11 text-white" style={{ backgroundColor: theme.ink }}>
                <p className={`${rotulo} text-center text-white/60`}>La celebración</p>
                <h2 className="mt-3 text-center text-3xl" style={{ fontFamily: "var(--font-display)" }}>Nuestra cronología</h2>
                <div className="mt-7 grid gap-3">
                  {timeline.map((item, index) => <p key={`${item}-${index}`} className="border-l pl-4 text-sm leading-relaxed text-white/90" style={{ borderColor: theme.accent }}>{item}</p>)}
                </div>
              </section>
            </Reveal>
          )}

          {(state.dr || paleta.length > 0 || evitar.length > 0) && (
            <Reveal>
              <section className="marco-doble relative px-9 py-12 text-center" style={{ color: theme.ink }}>
                <p className={rotulo} style={{ color: theme.accent }}>Código de vestimenta</p>
                {state.dr && <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>{state.dr}</h2>}
                <p className="mx-auto mt-6 text-[11px] uppercase tracking-[.2em] opacity-55">Paleta sugerida</p>
                <div className="mt-3 flex flex-wrap justify-center gap-4">
                  {(paleta.length > 0
                    ? paleta
                    : [{ label: "", color: theme.accent }, { label: "", color: theme.blush }, { label: "", color: theme.ink }]
                  ).map((color, index) => (
                    <span key={`${color.label}-${index}`} className="grid w-16 justify-items-center gap-1.5 text-[11px] leading-tight">
                      <span className="h-9 w-9 rounded-full border border-black/10" style={{ backgroundColor: color.color }} />
                      {color.label}
                    </span>
                  ))}
                </div>
                {evitar.length > 0 && (
                  <>
                    <p className="mt-8 text-[11px] uppercase tracking-[.2em] opacity-55">Colores a evitar</p>
                    <div className="mt-3 flex flex-wrap justify-center gap-2">
                      {evitar.map((color, index) => (
                        <span key={`${color.label}-${index}`} className="flex items-center gap-2 rounded-full border border-tinta/15 bg-white/70 px-3 py-1.5 text-xs line-through opacity-75">
                          <span className="h-3.5 w-3.5 rounded-full border border-black/10" style={{ backgroundColor: color.color }} />
                          {color.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </section>
            </Reveal>
          )}

          {avisos.length > 0 && (
            <Reveal>
              <section className="px-7 py-11" style={{ backgroundColor: theme.blush, color: theme.ink }}>
                <p className={`${rotulo} text-center`} style={{ color: theme.accent }}>A tomar en cuenta</p>
                <ul className="mx-auto mt-5 grid max-w-xs gap-3 text-sm leading-relaxed">
                  {avisos.map((aviso, index) => (
                    <li key={`${aviso}-${index}`} className="flex gap-3">
                      <span style={{ color: theme.accent }}>{theme.ornament}</span>
                      <span>{aviso}</span>
                    </li>
                  ))}
                </ul>
              </section>
            </Reveal>
          )}

          {recuerdos.length > 0 && (
            <Reveal>
              <section className="px-7 py-11 text-center" style={{ color: theme.ink }}>
                <p className={rotulo} style={{ color: theme.accent }}>Nuestro álbum</p>
                <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>Recuerdos compartidos</h2>
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {recuerdos.map((recuerdo) => (
                    <a key={recuerdo.id} href={shareUrl} className="block overflow-hidden rounded-xl">
                      <img src={recuerdo.posterUrl ?? recuerdo.url} alt="" loading="lazy" className="aspect-square w-full object-cover" />
                    </a>
                  ))}
                </div>
                <p className="mt-4 text-sm text-tinta/60">Sube las tuyas desde el álbum, sin instalar nada.</p>
              </section>
            </Reveal>
          )}

          {state.bd && albumCode && (
            <Reveal>
              <section className="px-7 py-11 text-center" style={{ backgroundColor: theme.blush, color: theme.ink }}>
                <p className={rotulo} style={{ color: theme.accent }}>Buenos deseos</p>
                <h2 className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>Déjanos unas palabras</h2>
                <p className="mx-auto mt-2 max-w-xs text-sm text-tinta/65">Se guardan en el muro de mensajes y se imprimen en el libro de recuerdos.</p>
                {deseoEstado === "sent" ? (
                  <p className="mt-5 rounded-2xl bg-white/85 p-4 text-sm">¡Gracias! Tu mensaje quedará en el libro.</p>
                ) : (
                  <form onSubmit={sendDeseo} className="mt-5 grid gap-3 text-left">
                    <input value={deseoNombre} onChange={(e) => setDeseoNombre(e.target.value)} maxLength={100} placeholder="Tu nombre (opcional)" className="rounded-xl border border-tinta/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-teja" />
                    <textarea required value={deseoTexto} onChange={(e) => setDeseoTexto(e.target.value)} maxLength={2000} rows={3} placeholder="Escribe tus buenos deseos…" className="resize-y rounded-xl border border-tinta/15 bg-white px-3 py-2.5 text-sm outline-none focus:border-teja" />
                    <button disabled={deseoEstado === "sending"} className="rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-60" style={{ backgroundColor: theme.accent }}>{deseoEstado === "sending" ? "Enviando…" : "Enviar mis buenos deseos"}</button>
                    {deseoEstado === "error" && <p className="text-center text-xs text-vino">No se pudo enviar. Inténtalo de nuevo.</p>}
                  </form>
                )}
                {deseos.length > 0 && (
                  <div className="mt-7 grid gap-3 text-left">
                    {deseos.map((deseo) => (
                      <blockquote key={deseo.id} className="rounded-2xl bg-white/80 p-4 text-sm">
                        <p className="italic leading-relaxed">“{deseo.body}”</p>
                        <footer className="mt-2 text-xs opacity-60">— {deseo.authorName || "Un invitado"}</footer>
                      </blockquote>
                    ))}
                  </div>
                )}
              </section>
            </Reveal>
          )}

          {state.hg && (
            <Reveal>
              <section className="px-7 py-11 text-center" style={{ color: theme.ink }}>
                <p className={rotulo} style={{ color: theme.accent }}>Comparte tus fotos</p>
                <p className="mt-3 text-3xl" style={{ fontFamily: "var(--font-display)" }}>#{state.hg}</p>
                <button onClick={() => copiarHashtag(state.hg as string)} className="mt-5 rounded-full border border-tinta/20 bg-white px-5 py-2.5 text-sm font-semibold text-tinta">
                  {hashtagCopiado ? "¡Copiado!" : "Copiar hashtag"}
                </button>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section className="grid gap-5 px-7 py-11">
              {rsvpForm}
              <a href={shareUrl} className="shimmer block rounded-full px-6 py-3 text-center font-semibold text-white shadow-soft" style={{ backgroundColor: theme.accent }}>Ver álbum de fotos</a>
            </section>
          </Reveal>
          <p className="pb-8 text-center text-xs text-tinta/40">Memorias Vivas</p>

          {/* Abajo a la izquierda: la esquina de la derecha ya la ocupa el
              botón de soporte por WhatsApp y tapaba este. */}
          {state.ms && (
            <button
              onClick={alternarMusica}
              aria-label={musicaSonando ? "Pausar la música" : "Poner la música"}
              className="fixed bottom-5 left-5 z-20 flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lift"
              style={{ backgroundColor: theme.accent }}
            >
              {musicaSonando ? <Pause size={18} /> : <Music size={18} />}
            </button>
          )}
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
