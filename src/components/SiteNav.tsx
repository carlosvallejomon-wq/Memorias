"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BuyAlbumButton } from "@/components/BuyAlbumButton";

const LINKS = [
  { href: "#como-funciona", label: "Cómo funciona" },
  { href: "#herramientas", label: "Qué incluye" },
  { href: "#invitaciones", label: "Invitaciones" },
  { href: "#dotbook", label: "Dotbook" },
  { href: "#preguntas", label: "Preguntas" },
];

const ENGLISH_LINKS = [
  { href: "#como-funciona", label: "How it works" },
  { href: "#herramientas", label: "What’s included" },
  { href: "#invitaciones", label: "Invitations" },
  { href: "#dotbook", label: "Dotbook" },
  { href: "#precios", label: "Pricing" },
];

// Barra superior de la portada. Se vuelve opaca al bajar para que el texto
// siga legible sobre las fotos, y en el móvil se despliega en vertical.
export function SiteNav({
  lang = "es",
  paymentsEnabled = false,
}: {
  lang?: "es" | "en";
  paymentsEnabled?: boolean;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const english = lang === "en";
  const links = english ? ENGLISH_LINKS : LINKS;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header className="sticky top-0 z-40 px-3 pt-2 sm:px-4 sm:pt-3">
      <div
        // Con el menú del móvil desplegado la pastilla se pinta sí o sí,
        // aunque no se haya bajado: si no, los enlaces quedan flotando sobre
        // la foto de la portada y no se leen.
        className={`barra-pastilla mx-auto max-w-6xl overflow-hidden transition-all duration-300 ${
          scrolled || open ? "" : "barra-pastilla-arriba"
        }`}
      >
      <div className="flex items-center justify-between gap-4 px-4 py-3 sm:px-5">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <img src="/brand/memorias-vivas-logo.png" alt="" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
          <span style={{ fontFamily: "var(--font-display)" }} className="text-lg">
            Memorias Vivas
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
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
          <Link
            href="/dashboard"
            className="hidden rounded-full px-3 py-2 text-sm font-semibold text-tinta/70 transition hover:bg-arena hover:text-tinta sm:inline-flex"
          >
            {english ? "Sign in" : "Iniciar sesión"}
          </Link>
          <div className="hidden sm:block">
            {paymentsEnabled ? (
              <BuyAlbumButton
                english={english}
                className="px-5 py-2.5"
                label={english ? "Buy my album · $39" : "Comprar mi álbum · $39"}
              />
            ) : (
              <Link href="/dashboard" className="btn btn-primary shimmer px-5 py-2.5">
                {english ? "Create my album" : "Crear mi álbum"}
              </Link>
            )}
          </div>
          <Link
            href={english ? "/" : "/?lang=en"}
            className="rounded-full px-2 py-1 text-xs font-semibold text-tinta/60 transition hover:bg-arena"
            aria-label={english ? "Cambiar a español" : "Switch to English"}
          >
            {english ? "ES" : "EN"}
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
        <div className="animate-fade-in border-t border-tinta/8 px-5 pb-4 md:hidden">
          <nav className="flex flex-col">
            {links.map((l) => (
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
          <div className="mt-4">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="btn btn-soft mb-2 w-full"
            >
              {english ? "Sign in" : "Iniciar sesión"}
            </Link>
            {paymentsEnabled ? (
              <BuyAlbumButton
                english={english}
                className="w-full px-5 py-3"
                label={english ? "Buy my album · $39" : "Comprar mi álbum · $39"}
              />
            ) : (
              <Link href="/dashboard" className="btn btn-primary w-full">
                {english ? "Create my album" : "Crear mi álbum"}
              </Link>
            )}
          </div>
        </div>
      )}
      </div>
    </header>
  );
}
