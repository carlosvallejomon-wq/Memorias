"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Camera, Menu, X } from "lucide-react";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#herramientas", label: "Qué incluye" },
  { href: "#invitaciones", label: "Invitaciones" },
  { href: "#dotbook", label: "Dotbook" },
  { href: "#preguntas", label: "Preguntas" },
];

// Barra superior de la portada. Se vuelve opaca al bajar para que el texto
// siga legible sobre las fotos, y en el móvil se despliega en vertical.
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`barra-cristal sticky top-0 z-40 transition-colors ${
        scrolled ? "" : "barra-cristal-arriba"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-tinta text-crema">
            <Camera size={18} />
          </span>
          <span style={{ fontFamily: "var(--font-display)" }} className="text-lg">
            Memorias Vivas
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm font-medium text-tinta/70 transition hover:bg-arena hover:text-tinta"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn btn-primary shimmer hidden px-5 py-2.5 sm:flex">
            Crear mi álbum
          </Link>
          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Abrir menú"
            className="btn btn-soft p-2.5 md:hidden"
          >
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="barra-cristal animate-fade-in border-t border-tinta/8 px-6 pb-4 md:hidden">
          <nav className="flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="border-b border-tinta/5 py-3 font-medium text-tinta/80"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Link href="/dashboard" className="btn btn-primary mt-4 w-full">
            Crear mi álbum
          </Link>
        </div>
      )}
    </header>
  );
}
