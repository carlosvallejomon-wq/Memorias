"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUp, Music, Pause } from "lucide-react";
import QRCode from "qrcode";
import { Reveal } from "@/components/Reveal";
import {
  TEMPLATES,
  renderInvitation,
  defaultDetailsLayout,
  loadImage,
  ensureInvitationFonts,
  type InvitationData,
} from "@/components/InvitationGenerator";
import type { EstiloInvitacion, InvitationLinkState } from "@/lib/invitation-link";

type CountdownPart = { label: string; value: number };

// La cuenta atrás se pinta como en las invitaciones de papel: cuatro números
// finos separados por dos puntos, con el rótulo debajo.
function countdownParts(startsAt?: string): CountdownPart[] | "llegó" | null {
  if (!startsAt) return null;
  const target = new Date(startsAt).getTime();
  if (Number.isNaN(target)) return null;
  const remaining = target - Date.now();
  if (remaining <= 0) return "llegó";
  return [
    { label: "Días", value: Math.floor(remaining / 86_400_000) },
    { label: "Horas", value: Math.floor((remaining % 86_400_000) / 3_600_000) },
    { label: "Minutos", value: Math.floor((remaining % 3_600_000) / 60_000) },
    { label: "Segundos", value: Math.floor((remaining % 60_000) / 1_000) },
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

/** Iniciales del lacre: las que ponga el organizador o, si no, las del nombre. */
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
  rosapalo: "#e2b8b3", palorosa: "#e2b8b3", verdeolivo: "#6b7a4b", verdementa: "#b8ddc9",
  azulmarino: "#25395c", azulcielo: "#a8cbe4", rosaviejo: "#c98b96", oroviejo: "#b18f3a",
  rosadorado: "#e0a899", verdeagua: "#a9d6cc", azulrey: "#1f3f8f",
};

/** Color de un nombre suelto, probando el nombre entero y luego cada palabra. */
function colorDe(label: string): string {
  const limpio = label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const junto = limpio.replace(/[^a-z#0-9]/g, "");
  if (COLORES[junto]) return COLORES[junto];
  if (/^#[0-9a-f]{3,8}$/.test(junto)) return junto;
  for (const palabra of limpio.split(/\s+/)) {
    const clave = palabra.replace(/[^a-z#0-9]/g, "");
    if (COLORES[clave]) return COLORES[clave];
  }
  return label;
}

function colorList(value?: string): { label: string; color: string }[] {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 8)
    .map((label) => ({ label, color: colorDe(label) }));
}

// Paleta de cada estilo, uno por tipo de evento. `paper` es el fondo claro,
// `soft` el tono medio de las bandas alternas, `mezcla` el del sobre y `band`
// el fuerte, sobre el que el texto va en blanco.
const TEMAS = {
  quince: {
    name: "Quinceañera romántica", ink: "#54222f", paper: "#fdf2f6", soft: "#f8dee7",
    mezcla: "#f0c2d2", band: "#b05a76", accent: "#b05a76", ornament: "✦",
  },
  boda: {
    name: "Boda editorial", ink: "#3c3029", paper: "#faf5ec", soft: "#f0e6d5",
    mezcla: "#e0cdac", band: "#a07551", accent: "#a07551", ornament: "❦",
  },
  baby: {
    name: "Baby shower delicado", ink: "#2f4a40", paper: "#f3f9f4", soft: "#dfeee4",
    mezcla: "#c6ded1", band: "#5f8574", accent: "#5f8574", ornament: "✿",
  },
  cumple: {
    name: "Cumpleaños cálido", ink: "#5a2f22", paper: "#fdf5f0", soft: "#fae0d3",
    mezcla: "#f4c6ae", band: "#c06a3c", accent: "#c06a3c", ornament: "❋",
  },
  bautizo: {
    name: "Bautizo celeste", ink: "#26405c", paper: "#f4f8fc", soft: "#dde9f4",
    mezcla: "#c2d8ea", band: "#5a80a6", accent: "#5a80a6", ornament: "✧",
  },
  comunion: {
    name: "Comunión dorada", ink: "#4a3f2a", paper: "#fdfaf1", soft: "#f4ecd8",
    mezcla: "#e8dbb8", band: "#9c8546", accent: "#9c8546", ornament: "✤",
  },
  graduacion: {
    name: "Graduación de gala", ink: "#22283f", paper: "#f6f6fa", soft: "#e2e4ee",
    mezcla: "#c8cbdd", band: "#474f76", accent: "#474f76", ornament: "✦",
  },
} as const;

function visualTheme(style?: EstiloInvitacion) {
  return TEMAS[style ?? "quince"] ?? TEMAS.quince;
}

type Tema = ReturnType<typeof visualTheme>;
type Recuerdo = { id: string; url: string; type: string; posterUrl: string | null };
type Deseo = { id: string; authorName: string | null; body: string };

/** Percha: el dibujo a línea del código de vestimenta. */
function IconoVestimenta({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 40" className="mx-auto h-10 w-24" fill="none" stroke={color} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 14c0-5-4.6-4.6-4.6-8.4A4.4 4.4 0 0 1 32 1.4a4.4 4.4 0 0 1 4.6 4.2" />
      <path d="M32 14 4.4 31.4c-1.6 1-1 3.2.9 3.2h53.4c1.9 0 2.5-2.2.9-3.2Z" />
    </svg>
  );
}

/** Dos copas brindando: el dibujo de la cronología. */
function IconoBrindis({ color }: { color: string }) {
  return (
    <svg viewBox="0 0 64 40" className="mx-auto h-12 w-28" fill="none" stroke={color} strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g transform="rotate(-13 20 20)">
        <path d="M11 6h18l-9 13z" /><path d="M20 19v13" /><path d="M14 33h12" />
      </g>
      <g transform="rotate(13 44 20)">
        <path d="M35 6h18l-9 13z" /><path d="M44 19v13" /><path d="M38 33h12" />
      </g>
    </svg>
  );
}

/** Lacre dorado; hace de separador entre secciones y de cierre del sobre. */
function Lacre({ texto, tamaño = "h-16 w-16 text-xl" }: { texto: string; tamaño?: string }) {
  return (
    <span className={`lacre-oro tipo-manuscrita ${tamaño}`} aria-hidden="true">
      {texto}
    </span>
  );
}

/** El mismo lacre, partido en dos mitades que se separan al abrir el sobre. */
function LacreRoto({ texto, tamaño }: { texto: string; tamaño: string }) {
  return (
    <span className={`lacre-roto block ${tamaño}`} aria-hidden="true">
      <span className="lacre-oro tipo-manuscrita mitad-izq">{texto}</span>
      <span className="lacre-oro tipo-manuscrita mitad-der">{texto}</span>
    </span>
  );
}

/** Filete con el adorno del tema en medio; va bajo los títulos. */
function Filigrana({ tema, claro = false }: { tema: Tema; claro?: boolean }) {
  return (
    <p className={`filigrana mt-3 text-xs ${claro ? "text-white/70" : ""}`} style={claro ? undefined : { color: tema.accent }} aria-hidden="true">
      {tema.ornament}
    </p>
  );
}

/** Pétalos cayendo despacio de fondo. Con `prefers-reduced-motion` no salen. */
function Petalos({ tema }: { tema: Tema }) {
  // Posiciones fijas y no aleatorias: si cambiaran en cada render, React
  // volvería a arrancar las animaciones y los pétalos darían saltos.
  const semillas = [
    { x: 6, d: 15, r: 0, s: 11 }, { x: 19, d: 21, r: 5, s: 8 }, { x: 31, d: 17, r: 9, s: 13 },
    { x: 45, d: 24, r: 2, s: 9 }, { x: 58, d: 19, r: 12, s: 12 }, { x: 70, d: 26, r: 7, s: 10 },
    { x: 82, d: 16, r: 14, s: 8 }, { x: 91, d: 22, r: 4, s: 12 }, { x: 38, d: 28, r: 18, s: 9 },
  ];
  return (
    <div className="lluvia" aria-hidden="true">
      {semillas.map((p) => (
        <span
          key={p.x}
          className="petalo"
          style={{
            left: `${p.x}%`,
            width: p.s,
            height: p.s,
            backgroundColor: tema.accent,
            animationDuration: `${p.d}s`,
            animationDelay: `${-p.r}s`,
          }}
        />
      ))}
    </div>
  );
}

function SeparadorLacre({ tema, texto }: { tema: Tema; texto: string }) {
  return (
    <div className="flex items-center justify-center gap-4 py-8" style={{ backgroundColor: tema.paper }}>
      <span className="h-px w-16" style={{ backgroundColor: tema.accent, opacity: 0.35 }} />
      <Lacre texto={texto} tamaño="h-12 w-12 text-base" />
      <span className="h-px w-16" style={{ backgroundColor: tema.accent, opacity: 0.35 }} />
    </div>
  );
}

/**
 * La invitación tal y como la ve el invitado.
 *
 * Recibe el estado ya resuelto porque llega por dos caminos: el enlace largo
 * (`/invitacion?d=…`, que lo trae en la propia URL) y el corto
 * (`/i/<código>`, que lo lee de la tabla `invitations` y por eso puede
 * editarse después). `abierto` lo usa la vista previa del editor para
 * enseñar el interior sin tener que abrir el sobre en cada refresco.
 */
export function InvitationView({
  state: estadoRecibido,
  abierto = false,
}: {
  state: InvitationLinkState;
  abierto?: boolean;
}) {
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
  // animación de la solapa y el lacre) y abierto. La vista previa del editor
  // pide `abierto=1` para enseñar el interior sin tener que tocar el sobre en
  // cada refresco.
  const [sobre, setSobre] = useState<"cerrado" | "abriendo" | "abierto">(
    abierto ? "abierto" : "cerrado",
  );
  const [musicaSonando, setMusicaSonando] = useState(false);
  const [recuerdos, setRecuerdos] = useState<Recuerdo[]>([]);
  const [deseos, setDeseos] = useState<Deseo[]>([]);
  const [deseoNombre, setDeseoNombre] = useState("");
  const [deseoTexto, setDeseoTexto] = useState("");
  const [deseoEstado, setDeseoEstado] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [hashtagCopiado, setHashtagCopiado] = useState(false);
  const [, setClock] = useState(0);

  const invitation = useMemo(() => {
    const template = TEMPLATES.find((candidate) => candidate.id === estadoRecibido.t);
    if (!template) {
      return { error: "Esta invitación usa un diseño que ya no está disponible." } as const;
    }
    return { state: estadoRecibido, template, error: null } as const;
  }, [estadoRecibido]);

  const albumCode = invitation.error ? null : albumCodeFrom(invitation.state.u);

  // La cuenta atrás lleva segundos, así que se refresca cada segundo. Solo
  // mientras la invitación está abierta: con el sobre cerrado no se ve.
  useEffect(() => {
    if (invitation.error || !invitation.state.it || !invitation.state.st) return;
    if (sobre !== "abierto") return;
    const interval = window.setInterval(() => setClock((value) => value + 1), 1_000);
    return () => window.clearInterval(interval);
  }, [invitation, sobre]);

  // Fotos del álbum y buenos deseos ya escritos. Se piden mientras el invitado
  // mira el sobre, para que la portada ya tenga su foto al abrirlo. Si el
  // álbum tiene código de acceso el servidor responde 403 y esas secciones
  // sencillamente no aparecen.
  useEffect(() => {
    if (invitation.error || !invitation.state.it || !albumCode) return;
    const { state } = invitation;
    let cancelled = false;
    if (state.ga && (state.fg ?? []).length === 0) {
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
  }, [invitation, albumCode]);

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
    window.setTimeout(() => setSobre("abierto"), 1300);
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
  const tema = visualTheme(state.iv);
  const iniciales = sealInitials(state);
  const cuenta = countdownParts(state.st);
  const calendarUrl = googleCalendarUrl(state);
  const timeline = (state.tl ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const avisos = (state.av ?? "").split("\n").map((item) => item.trim()).filter(Boolean);
  const paleta = colorList(state.pa);
  const evitar = colorList(state.ev);
  // La portada lleva la foto que subió el organizador al preparar la
  // invitación; si no puso ninguna, la primera del álbum, y si el álbum
  // todavía está vacío, el propio diseño de la invitación.
  const fotoPortada = state.fp ?? recuerdos[0]?.posterUrl ?? recuerdos[0]?.url ?? template.bgImage ?? null;
  // Lo mismo con la galería: manda la que preparó el organizador, porque
  // cuando reparte la invitación el álbum suele estar vacío.
  const galeria: string[] = (state.fg ?? []).length > 0
    ? (state.fg as string[])
    : recuerdos.map((recuerdo) => recuerdo.posterUrl ?? recuerdo.url);

  const rsvpForm = state.ar && (
    <form onSubmit={sendRsvp} className="cartucho px-6 py-8 text-center" style={{ color: tema.ink }}>
      <p className="tipo-manuscrita text-4xl">Confirma tu asistencia</p>
      <p className="mt-2 text-sm opacity-70">Nos encantará celebrar contigo.</p>
      {rsvpState === "sent" ? (
        <p className="mt-5 text-sm">¡Gracias! Tu respuesta fue enviada.</p>
      ) : (
        <div className="mt-5 grid gap-3 text-left">
          <input required value={rsvpName} onChange={(e) => setRsvpName(e.target.value)} maxLength={100} placeholder="Tu nombre" className="rounded-none border-0 border-b bg-transparent px-1 py-2 text-sm outline-none placeholder:opacity-50" style={{ borderColor: tema.accent }} />
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button type="button" onClick={() => setRsvpAttending(true)} className="rotulo border px-3 py-2.5" style={rsvpAttending ? { backgroundColor: tema.accent, color: "#fff", borderColor: tema.accent } : { borderColor: tema.accent }}>Sí, asistiré</button>
            <button type="button" onClick={() => setRsvpAttending(false)} className="rotulo border px-3 py-2.5" style={!rsvpAttending ? { backgroundColor: tema.ink, color: "#fff", borderColor: tema.ink } : { borderColor: tema.accent }}>No podré</button>
          </div>
          {rsvpAttending && <label className="text-xs opacity-70">Personas en tu grupo<input type="number" min="1" max="20" value={rsvpGuests} onChange={(e) => setRsvpGuests(Math.max(1, Number(e.target.value) || 1))} className="mt-1 block w-full rounded-none border-0 border-b bg-transparent px-1 py-2 text-sm text-inherit outline-none" style={{ borderColor: tema.accent }} /></label>}
          <input value={rsvpNote} onChange={(e) => setRsvpNote(e.target.value)} maxLength={300} placeholder="Mensaje opcional" className="rounded-none border-0 border-b bg-transparent px-1 py-2 text-sm outline-none placeholder:opacity-50" style={{ borderColor: tema.accent }} />
          <button disabled={rsvpState === "sending"} className="rotulo mt-2 px-4 py-3 text-white disabled:opacity-60" style={{ backgroundColor: tema.accent }}>{rsvpState === "sending" ? "Enviando…" : "Enviar confirmación"}</button>
          {rsvpState === "error" && <p className="text-center text-xs text-vino">No se pudo enviar. Inténtalo de nuevo.</p>}
        </div>
      )}
    </form>
  );

  // La invitación clásica (sin experiencia interactiva) conserva su
  // formulario de siempre: el de arriba va con los colores del tema.
  const rsvpClasico = state.ar && (
    <form onSubmit={sendRsvp} className="w-full max-w-md rounded-3xl border border-white/70 bg-white/95 p-5 shadow-lift">
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
    <div className={interactive ? "min-h-screen" : "flex min-h-screen flex-col items-center justify-center gap-5 bg-arena p-6"} style={interactive ? { backgroundColor: tema.paper, color: tema.ink, fontFamily: '"Playfair Display", var(--font-display)' } : undefined}>
      {!ready && <p className="p-6 text-center text-sm text-tinta/50">Cargando invitación…</p>}
      <canvas ref={canvasRef} className={interactive ? "hidden" : `w-full max-w-md rounded-2xl shadow-lift ${ready ? "" : "hidden"}`} />
      {interactive && state.ms && <audio ref={musicRef} src={state.ms} loop preload="none" className="hidden" />}
      {ready && shareUrl && (interactive ? (
        sobre !== "abierto" ? (
          <main
            className={`sobre mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-8 text-center ${sobre === "abriendo" ? "sobre-abriendo" : ""}`}
            style={{ background: `linear-gradient(170deg, ${tema.paper} 0%, ${tema.soft} 100%)` }}
          >
            <Petalos tema={tema} />
            <p className="rotulo relative opacity-55">Estás invitado</p>

            <button
              type="button"
              onClick={abrirSobre}
              aria-label={`Abrir la invitación de ${state.n}`}
              className="sobre-cuerpo relative mt-9 aspect-[7/5] w-full max-w-sm rounded-lg shadow-lift"
              style={{ backgroundColor: tema.mezcla }}
            >
              {/* Solapa cerrada; gira hacia arriba al romperse el lacre. */}
              <span className="sobre-solapa absolute inset-x-0 top-0 z-10 h-[62%] rounded-t-lg" style={{ backgroundColor: tema.soft, clipPath: "polygon(0 0, 100% 0, 50% 100%)" }} />
              {/* Tarjeta apoyada sobre la punta de la solapa, con el gesto. */}
              <span className="sobre-tarjeta absolute left-1/2 top-[22%] z-20 flex h-[46%] w-[38%] -translate-x-1/2 flex-col items-center gap-[5%] bg-white p-[5%] shadow-lift">
                <span className="rotulo shrink-0 whitespace-nowrap text-[0.32rem] tracking-[.1em] opacity-55" style={{ color: tema.ink }}>Toca aquí</span>
                {fotoPortada && <img src={fotoPortada} alt="" className="min-h-0 w-full flex-1 object-cover" />}
              </span>
              <span className="absolute left-1/2 top-[62%] z-30 h-12 w-12 -translate-x-1/2 -translate-y-1/2">
                <LacreRoto texto={iniciales} tamaño="h-12 w-12 text-base" />
              </span>
              <span className="pointer-events-none absolute inset-0 z-30 rounded-lg border" style={{ borderColor: "rgba(0,0,0,.08)" }} />
            </button>

            <p className="tipo-manuscrita mt-10 text-5xl" style={{ color: tema.ink }}>{state.n}</p>
            {state.d && <p className="rotulo mt-4 opacity-60">{state.d}</p>}
            <p className="mt-10 animate-pulse text-xs opacity-50">Toca el sobre para abrirlo</p>
          </main>
        ) : (
        <main className="relative mx-auto max-w-md overflow-hidden shadow-lift animate-fade-in" style={{ backgroundColor: tema.paper }}>
          <Petalos tema={tema} />
          {/* Portada: nombre, foto enmarcada y fecha, como una lámina. */}
          <section className="px-8 pb-12 pt-14 text-center">
            <p className="rotulo opacity-55">Estás invitado</p>
            <h1 className="tipo-titulo mt-5 text-3xl uppercase tracking-[.28em]">{state.n}</h1>
            {fotoPortada && (
              <div className="marco-foto marco-arco mx-auto mt-8 w-[74%]">
                <img src={fotoPortada} alt="" className="aspect-[3/4] w-full object-cover" />
              </div>
            )}
            {state.d && <p className="tipo-titulo mt-7 text-lg tracking-[.18em]">{state.d}</p>}
            {state.o && <p className="mx-auto mt-3 max-w-[15rem] text-sm italic opacity-65">{state.o}</p>}
            <p className="mt-10 text-xs opacity-45">Desliza para descubrir</p>
          </section>

          <Reveal>
            <section className="px-8 py-12 text-center" style={{ backgroundColor: tema.soft }}>
              <p className="rotulo opacity-60">Falta poco para</p>
              <p className="tipo-manuscrita mt-1 text-5xl">el gran día</p>
              <Filigrana tema={tema} />
              {cuenta === "llegó" && <p className="tipo-manuscrita mt-6 text-5xl">¡Hoy es el día!</p>}
              {Array.isArray(cuenta) && (
                <div className="mx-auto mt-7 grid max-w-[19rem] grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] items-start">
                  {cuenta.map((parte, i) => (
                    <span key={parte.label} className="contents">
                      {i > 0 && <span className="cuenta-atras dos-puntos">:</span>}
                      <span className="grid justify-items-center">
                        <span
                          key={i === 3 ? parte.value : "fijo"}
                          className={`cuenta-atras ${i === 3 ? "late" : ""}`}
                          style={i === 3 ? { opacity: 0.45 } : undefined}
                        >
                          {String(parte.value).padStart(2, "0")}
                        </span>
                        <span className="rotulo mt-1 text-[0.5rem] tracking-[.12em] opacity-55">{parte.label}</span>
                      </span>
                    </span>
                  ))}
                </div>
              )}
              {calendarUrl && (
                <a href={calendarUrl} target="_blank" rel="noreferrer" className="rotulo mt-8 inline-block border px-5 py-2.5" style={{ borderColor: tema.accent, color: tema.accent }}>
                  Agendar recordatorio
                </a>
              )}
            </section>
          </Reveal>

          <SeparadorLacre tema={tema} texto={iniciales} />

          <Reveal>
            <section className="px-8 py-12 text-center text-white" style={{ backgroundColor: tema.band }}>
              <p className="tipo-manuscrita text-5xl">Fecha y lugar</p>
              <Filigrana tema={tema} claro />
              {state.h && <p className="rotulo mt-6 opacity-85">{state.h}</p>}
              {state.l && <p className="tipo-titulo mx-auto mt-3 max-w-xs text-base leading-relaxed">{state.l}</p>}
              {state.mp && (
                <a href={state.mp} target="_blank" rel="noreferrer" className="rotulo mt-7 inline-block border border-white/70 px-5 py-2.5">
                  Ver ubicación
                </a>
              )}
            </section>
          </Reveal>

          {timeline.length > 0 && (
            <Reveal>
              <section className="px-8 py-12 text-center">
                <p className="tipo-manuscrita text-5xl">Nuestra cronología</p>
              <Filigrana tema={tema} />
                <div className="mt-5"><IconoBrindis color={tema.accent} /></div>
                <div className="mx-auto mt-6 grid max-w-xs gap-4">
                  {timeline.map((item, index) => (
                    <p key={`${item}-${index}`} className="tipo-titulo text-sm tracking-wide">{item}</p>
                  ))}
                </div>
              </section>
            </Reveal>
          )}

          {(state.dr || paleta.length > 0 || evitar.length > 0) && (
            <Reveal>
              <section className="px-8 py-12 text-center text-white" style={{ backgroundColor: tema.band }}>
                <p className="tipo-manuscrita text-5xl">Código de vestimenta</p>
              <Filigrana tema={tema} claro />
                <div className="mt-5"><IconoVestimenta color="#fff" /></div>
                {state.dr && <p className="rotulo mt-5 text-sm">{state.dr}</p>}
                {paleta.length > 0 && (
                  <>
                    <p className="rotulo mt-8 text-[0.6rem] opacity-80">Colores a usar</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-4">
                      {paleta.map((color, index) => (
                        <span key={`${color.label}-${index}`} className="grid w-16 justify-items-center gap-1.5 text-[10px] leading-tight opacity-90">
                          <span className="h-8 w-8 rounded-full border border-white/40" style={{ backgroundColor: color.color }} />
                          {color.label}
                        </span>
                      ))}
                    </div>
                  </>
                )}
                {evitar.length > 0 && (
                  <>
                    <p className="rotulo mt-8 text-[0.6rem] opacity-80">Colores a evitar</p>
                    <div className="mt-4 flex flex-wrap justify-center gap-3">
                      {evitar.map((color, index) => (
                        <span key={`${color.label}-${index}`} className="flex items-center gap-2 text-[11px] line-through opacity-85">
                          <span className="h-3.5 w-3.5 rounded-full border border-white/40" style={{ backgroundColor: color.color }} />
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
              <section className="px-6 py-12" style={{ backgroundColor: tema.soft }}>
                <div className="cartucho px-7 py-9 text-center" style={{ color: tema.accent }}>
                  <p className="tipo-manuscrita text-5xl" style={{ color: tema.ink }}>A tomar en cuenta</p>
                  <ul className="mx-auto mt-6 grid max-w-xs gap-3 text-left text-sm" style={{ color: tema.ink }}>
                    {avisos.map((aviso, index) => (
                      <li key={`${aviso}-${index}`} className="tipo-titulo flex gap-3">
                        <span className="opacity-60">{index + 1}.</span>
                        <span>{aviso}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </Reveal>
          )}

          {galeria.length > 0 && (
            <Reveal>
              <section className="px-6 py-12 text-center">
                <p className="tipo-manuscrita text-5xl">Galería de fotos</p>
              <Filigrana tema={tema} />
                <div className="mt-7 grid grid-cols-2 gap-3">
                  {galeria.map((foto, index) => (
                    <a key={foto} href={shareUrl} className="marco-foto block" style={{ transitionDelay: `${index * 60}ms` }}>
                      <img src={foto} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
                    </a>
                  ))}
                </div>
                <p className="mt-6 text-xs opacity-55">Sube las tuyas desde el álbum, sin instalar nada.</p>
              </section>
            </Reveal>
          )}

          {state.bd && albumCode && (
            <Reveal>
              <section className="px-6 py-12" style={{ backgroundColor: tema.soft }}>
                <div className="cartucho px-7 py-9 text-center" style={{ color: tema.accent }}>
                  <p className="tipo-manuscrita text-5xl" style={{ color: tema.ink }}>Buenos</p>
                  <p className="tipo-titulo -mt-1 text-xl uppercase tracking-[.3em]" style={{ color: tema.ink }}>Deseos</p>
                  <p className="mx-auto mt-4 max-w-xs text-xs opacity-70" style={{ color: tema.ink }}>
                    Se guardan en el muro de mensajes y se imprimen en el libro de recuerdos.
                  </p>
                  {deseoEstado === "sent" ? (
                    <p className="mt-6 text-sm" style={{ color: tema.ink }}>¡Gracias! Tu mensaje quedará en el libro.</p>
                  ) : (
                    <form onSubmit={sendDeseo} className="mt-6 grid gap-3 text-left" style={{ color: tema.ink }}>
                      <input value={deseoNombre} onChange={(e) => setDeseoNombre(e.target.value)} maxLength={100} placeholder="Tu nombre (opcional)" className="border-0 border-b bg-transparent px-1 py-2 text-sm outline-none placeholder:opacity-50" style={{ borderColor: tema.accent }} />
                      <textarea required value={deseoTexto} onChange={(e) => setDeseoTexto(e.target.value)} maxLength={2000} rows={3} placeholder="Escribe tus buenos deseos…" className="resize-y border-0 border-b bg-transparent px-1 py-2 text-sm outline-none placeholder:opacity-50" style={{ borderColor: tema.accent }} />
                      <button disabled={deseoEstado === "sending"} className="rotulo mt-1 px-4 py-3 text-white disabled:opacity-60" style={{ backgroundColor: tema.accent }}>
                        {deseoEstado === "sending" ? "Enviando…" : "Enviar buenos deseos"}
                      </button>
                      {deseoEstado === "error" && <p className="text-center text-xs text-vino">No se pudo enviar. Inténtalo de nuevo.</p>}
                    </form>
                  )}
                  {deseos.length > 0 && (
                    <div className="mt-8 grid gap-4" style={{ color: tema.ink }}>
                      {deseos.map((deseo) => (
                        <blockquote key={deseo.id}>
                          <p className="tipo-titulo text-sm italic leading-relaxed">“{deseo.body}”</p>
                          <footer className="rotulo mt-2 text-[0.55rem] opacity-60">{deseo.authorName || "Un invitado"}</footer>
                        </blockquote>
                      ))}
                    </div>
                  )}
                </div>
              </section>
            </Reveal>
          )}

          {state.hg && (
            <Reveal>
              <section className="px-8 py-12 text-center text-white" style={{ backgroundColor: tema.band }}>
                <p className="rotulo opacity-80">Comparte tus fotos</p>
                <p className="tipo-manuscrita mt-3 text-5xl">#{state.hg}</p>
                <button onClick={() => copiarHashtag(state.hg as string)} className="rotulo mt-6 border border-white/70 px-5 py-2.5">
                  {hashtagCopiado ? "¡Copiado!" : "Copiar hashtag"}
                </button>
              </section>
            </Reveal>
          )}

          <Reveal>
            <section className="grid gap-6 px-6 py-12">
              {rsvpForm}
              <a href={shareUrl} className="rotulo block px-6 py-3.5 text-center text-white" style={{ backgroundColor: tema.accent }}>
                Ver álbum de fotos
              </a>
            </section>
          </Reveal>

          <SeparadorLacre tema={tema} texto={iniciales} />
          <p className="rotulo pb-10 text-center text-[0.55rem] opacity-40">Memorias Vivas</p>

          {/* Abajo a la izquierda: la esquina de la derecha ya la ocupa el
              botón de soporte por WhatsApp y tapaba estos. */}
          <div className="fixed bottom-5 left-5 z-20 grid gap-2">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              aria-label="Volver arriba"
              className="flex h-11 w-11 items-center justify-center rounded-full border text-current shadow-soft"
              style={{ borderColor: tema.accent, backgroundColor: tema.paper, color: tema.accent }}
            >
              <ArrowUp size={18} />
            </button>
            {state.ms && (
              <button
                onClick={alternarMusica}
                aria-label={musicaSonando ? "Pausar la música" : "Poner la música"}
                className="flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lift"
                style={{ backgroundColor: tema.accent }}
              >
                {musicaSonando ? <Pause size={18} /> : <Music size={18} />}
              </button>
            )}
          </div>
        </main>
        )
      ) : (
        <>
          {rsvpClasico}
          <a href={shareUrl} className="shimmer flex items-center gap-2 rounded-full bg-teja px-6 py-3 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro">Ver álbum de fotos</a>
        </>
      ))}
    </div>
  );
}
