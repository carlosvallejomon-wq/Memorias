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

  function goTo(index: number) {
    const el = trackRef.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.offsetWidth + 16 : 240;
    el.scrollTo({ left: index * step, behavior: "smooth" });
  }

  return (
    <div className="relative">
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
