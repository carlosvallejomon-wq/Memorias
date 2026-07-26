"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  QrCode,
  Target,
  Upload,
} from "lucide-react";
import { ChallengeIcon } from "@/components/ChallengeIcon";

// Aparición suave al llegar a la sección. Con `prefers-reduced-motion` las
// animaciones quedan neutralizadas desde globals.css, así que no molesta a
// quien pide menos movimiento.
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`reveal ${shown ? "reveal-in" : ""} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

export type Celebration = { label: string; src: string };

// Carrusel de celebraciones: se puede arrastrar con el dedo y pasar con las
// flechas. Antes era una fila que se cortaba por el borde y no se veía que
// hubiera más fotos detrás.
export function CelebrationCarousel({ items }: { items: Celebration[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [active, setActive] = useState(0);
  // El carrusel avanza solo, pero se detiene mientras el visitante lo está
  // usando (ratón encima, dedo sobre la tira o foco con el teclado).
  const [paused, setPaused] = useState(false);

  function sync() {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 4);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 1;
    setActive(Math.round(el.scrollLeft / step));
  }

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener("scroll", sync, { passive: true });
    window.addEventListener("resize", sync);
    return () => {
      el.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  function scrollByCards(dir: 1 | -1) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 240;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  }

  // Avance automático: una tarjeta cada 3 segundos y, al llegar al final,
  // vuelve al principio.
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      const el = trackRef.current;
      if (!el) return;
      const card = el.firstElementChild as HTMLElement | null;
      const step = card ? card.offsetWidth + 16 : 240;
      const fin = el.scrollLeft + el.clientWidth >= el.scrollWidth - 8;
      el.scrollTo({ left: fin ? 0 : el.scrollLeft + step, behavior: "smooth" });
    }, 3000);
    return () => clearInterval(id);
  }, [paused]);

  function goTo(index: number) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 240;
    el.scrollTo({ left: index * step, behavior: "smooth" });
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
    >
      <div
        ref={trackRef}
        className="scroll-x flex snap-x snap-mandatory gap-4 px-1 pb-3"
      >
        {items.map((e, i) => (
          <figure
            key={e.label}
            className="card-interactive zoom-hover w-40 shrink-0 snap-start sm:w-48"
            style={{ transform: `rotate(${i % 2 ? 1.1 : -1.1}deg)` }}
          >
            <div className="polaroid overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={e.src}
                alt={e.label}
                loading="lazy"
                className="aspect-[4/5] w-full rounded-sm object-cover"
              />
              <figcaption className="pt-2 text-center text-sm font-semibold text-tinta/70">
                {e.label}
              </figcaption>
            </div>
          </figure>
        ))}
      </div>

      <button
        onClick={() => scrollByCards(-1)}
        disabled={atStart}
        aria-label="Ver celebraciones anteriores"
        className="absolute -left-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white p-2.5 text-tinta shadow-lift transition hover:bg-arena disabled:pointer-events-none disabled:opacity-0 sm:block"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        onClick={() => scrollByCards(1)}
        disabled={atEnd}
        aria-label="Ver más celebraciones"
        className="absolute -right-2 top-1/2 hidden -translate-y-1/2 rounded-full bg-white p-2.5 text-tinta shadow-lift transition hover:bg-arena disabled:pointer-events-none disabled:opacity-0 sm:block"
      >
        <ChevronRight size={20} />
      </button>

      <div className="mt-2 flex justify-center gap-1.5">
        {items.map((e, i) => (
          <button
            key={e.label}
            onClick={() => goTo(i)}
            aria-label={`Ir a ${e.label}`}
            className={`h-1.5 rounded-full transition-all ${
              i === active ? "w-6 bg-teja" : "w-1.5 bg-tinta/20 hover:bg-tinta/40"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

const POOL = [
  "/decor/familia.jpg",
  "/decor/cumple.jpg",
  "/decor/viaje.jpg",
  "/decor/quince.jpg",
  "/decor/navidad.jpg",
  "/decor/boda.jpg",
  "/decor/comunion.jpg",
  "/decor/bautizo.jpg",
  "/decor/graduacion.jpg",
  "/decor/fiestainfantil.jpg",
  "/decor/babyshower.jpg",
  "/decor/anonuevo.jpg",
];

// Cuadrícula del móvil del hero: cada poco tiempo entra una foto nueva en una
// casilla, como cuando los invitados van subiendo durante el evento.
export function PhoneGrid() {
  const [tiles, setTiles] = useState(POOL.slice(0, 6));
  const next = useRef(6);

  useEffect(() => {
    const id = setInterval(() => {
      setTiles((prev) => {
        const copy = [...prev];
        copy[next.current % 6] = POOL[next.current % POOL.length];
        next.current += 1;
        return copy;
      });
    }, 1600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="grid grid-cols-3 gap-1.5">
      {tiles.map((src, i) => (
        <div key={i} className="aspect-square overflow-hidden rounded-lg shadow-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={src}
            src={src}
            alt=""
            className="animate-crossfade h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

const LIVE_PHOTOS = [
  { src: "/decor/boda.jpg", who: "Marta" },
  { src: "/decor/cumple.jpg", who: "Javi" },
  { src: "/decor/familia.jpg", who: "Abuela Carmen" },
  { src: "/decor/quince.jpg", who: "Lucía" },
  { src: "/decor/viaje.jpg", who: "Pedro" },
];

// Maqueta del modo pantalla: las fotos van cambiando solas, como en el
// evento real, y el contador sube cuando "llega" una foto nueva.
export function LiveScreenMockup() {
  const [index, setIndex] = useState(0);
  const [count, setCount] = useState(126);

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % LIVE_PHOTOS.length);
      setCount((c) => c + 1);
    }, 2800);
    return () => clearInterval(id);
  }, []);

  const photo = LIVE_PHOTOS[index];

  return (
    <div className="relative mx-auto w-full max-w-sm">
      <div className="glass-dark rounded-2xl p-3 shadow-lift">
        <div className="relative aspect-video overflow-hidden rounded-lg bg-black">
          {LIVE_PHOTOS.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={p.src}
              src={p.src}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
              style={{ opacity: i === index ? 1 : 0 }}
            />
          ))}

          <div className="absolute left-2 top-2 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-1 text-[10px] text-white backdrop-blur-sm">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teja opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-teja" />
            </span>
            En directo · {count} fotos
          </div>

          <div
            key={photo.who}
            className="animate-fade-in absolute bottom-2 left-2 flex items-center gap-1.5 rounded-lg bg-black/50 px-2.5 py-1.5 text-[11px] text-white backdrop-blur-sm"
          >
            <Upload size={11} /> Acaba de subirla {photo.who}
          </div>

          <div className="absolute bottom-2 right-2 flex h-9 w-9 items-center justify-center rounded-lg bg-white p-1">
            <QrCode size={22} className="text-tinta" />
          </div>
        </div>
      </div>
      {/* Peana */}
      <div className="mx-auto h-3 w-24 rounded-b-xl bg-tinta/20" />
      <div className="mx-auto h-1.5 w-40 rounded-full bg-tinta/10" />
    </div>
  );
}

// Ejemplos reales del generador de invitaciones (mismos archivos que usa el
// editor del panel), para que lo que se ve aquí sea lo que luego se obtiene.
const INVITACIONES = [
  "/invitation-templates/boda-04.jpg",
  "/invitation-templates/quince-rosasdoradas.jpg",
  "/invitation-templates/boda-10.jpg",
  "/invitation-templates/boda-14.jpg",
  "/invitation-templates/quince-negrodorado.jpg",
];

// Baraja de invitaciones que se van pasando solas. Cada tarjeta ocupa una
// posición fija (delante, un poco detrás, más detrás…) y al rotar el orden
// las transiciones hacen el movimiento.
export function InvitationDeck() {
  const [order, setOrder] = useState(INVITACIONES);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      setOrder((prev) => [...prev.slice(1), prev[0]]);
    }, 3200);
    return () => clearInterval(id);
  }, [paused]);

  const POSES = [
    { x: 0, y: 0, rot: -2, scale: 1, z: 50, op: 1 },
    { x: 34, y: -14, rot: 4, scale: 0.95, z: 40, op: 0.95 },
    { x: 66, y: -26, rot: 9, scale: 0.9, z: 30, op: 0.85 },
    { x: 94, y: -36, rot: 13, scale: 0.86, z: 20, op: 0.6 },
    { x: 116, y: -44, rot: 17, scale: 0.82, z: 10, op: 0.35 },
  ];

  return (
    <div
      className="relative mx-auto h-[22rem] w-full max-w-xs select-none sm:h-[26rem]"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {order.map((src, i) => {
        const p = POSES[Math.min(i, POSES.length - 1)];
        return (
          <button
            key={src}
            onClick={() => setOrder((prev) => [...prev.slice(1), prev[0]])}
            aria-label="Ver la siguiente invitación"
            className="absolute left-0 top-0 h-full w-[74%] overflow-hidden rounded-xl bg-white shadow-lift transition-all duration-700 ease-out"
            style={{
              transform: `translate3d(${p.x}px, ${p.y}px, 0) rotate(${p.rot}deg) scale(${p.scale})`,
              zIndex: p.z,
              opacity: p.op,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt="Ejemplo de invitación"
              loading="lazy"
              className="h-full w-full object-cover"
            />
          </button>
        );
      })}
    </div>
  );
}

const RETOS = [
  { icon: "brindis", title: "El brindis", n: 6 },
  { icon: "baile", title: "El mejor momento de baile", n: 3 },
  { icon: "grupo", title: "Un selfie en tu mesa", n: 0 },
];

export function RetosMockup() {
  return (
    <div className="glass w-full max-w-sm rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <p className="flex items-center gap-2 font-semibold">
          <Target size={16} className="text-teja" /> Retos del evento
        </p>
        <span className="text-sm font-semibold text-tinta/60">2 de 3</span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-tinta/10">
        <div className="h-full w-2/3 rounded-full bg-teja" />
      </div>
      <ul className="mt-3 space-y-2">
        {RETOS.map((r) => (
          <li
            key={r.title}
            className={`flex items-center gap-2.5 rounded-xl border p-2.5 text-sm ${
              r.n > 0 ? "border-teja/30 bg-teja/5" : "border-tinta/10 bg-white"
            }`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                r.n > 0
                  ? "bg-teja text-white shadow-soft"
                  : "bg-gradient-to-br from-teja/20 to-teja/5 text-teja"
              }`}
            >
              <ChallengeIcon icon={r.icon} size={17} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{r.title}</span>
            {r.n > 0 ? (
              <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teja-oscuro">
                <Check size={13} /> {r.n}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-teja px-2.5 py-1 text-xs font-semibold text-white">
                Subir
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
