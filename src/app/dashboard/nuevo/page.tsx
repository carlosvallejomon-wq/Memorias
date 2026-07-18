"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Camera, Lock, QrCode, Sparkles } from "lucide-react";
import { createAlbum } from "../actions";
import { AlbumKindPicker } from "@/components/AlbumKindPicker";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return base || "tu-album";
}

export default function NewAlbumPage() {
  const [name, setName] = useState("");

  return (
    <main className="relative mx-auto min-h-screen max-w-5xl overflow-hidden px-4 py-8">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-teja/15 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -left-20 h-64 w-64 rounded-full bg-vino/10 blur-3xl"
      />

      <Link
        href="/dashboard"
        className="relative inline-flex items-center gap-1.5 text-sm text-tinta/50 transition hover:text-tinta"
      >
        <ArrowLeft size={15} /> Mis álbumes
      </Link>

      <div className="relative mt-6 grid gap-10 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-arena px-3 py-1 text-sm font-semibold text-teja-oscuro">
            <Sparkles size={14} /> Listo en menos de un minuto
          </p>
          <h1
            className="mt-4 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Crea tu álbum
          </h1>
          <p className="mt-2 text-tinta/60">
            Ponle un nombre, elige de qué tipo es y en un momento tendrás un QR
            listo para compartir con tus invitados.
          </p>

          <form action={createAlbum} className="mt-8 flex flex-col gap-5">
            <div>
              <label className="mb-1 block text-sm font-semibold text-tinta/70">
                Nombre
              </label>
              <input
                name="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="p. ej. Boda de Ana y Luis"
                className="w-full rounded-xl border border-tinta/15 bg-white/90 px-4 py-3 text-base outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
              />
            </div>

            <AlbumKindPicker />

            <button
              type="submit"
              className="shimmer mt-2 flex items-center justify-center gap-2 rounded-full bg-teja px-7 py-3.5 text-lg font-semibold text-white shadow-lift transition hover:bg-teja-oscuro"
            >
              <Sparkles size={18} /> Crear álbum
            </button>
          </form>
        </div>

        <div className="relative flex justify-center">
          <div className="relative w-full max-w-[300px]">
            <div className="glass animate-fade-in relative rounded-[2.5rem] p-2.5">
              <div className="absolute left-1/2 top-3 h-1 w-10 -translate-x-1/2 rounded-full bg-tinta/20" />
              <div className="overflow-hidden rounded-[2rem] bg-white/80 pt-6">
                <div className="mx-2 mb-2 flex items-center gap-1.5 rounded-full bg-arena/80 px-3 py-1.5 text-[10px] text-tinta/50">
                  <Lock size={9} />
                  <span className="truncate">
                    memoriasvivas.app/a/{slugify(name)}
                  </span>
                </div>
                <div className="flex flex-col items-center px-5 pb-6 pt-2 text-center">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-tinta/70">
                    <Camera size={12} />{" "}
                    <span className="max-w-[180px] truncate">
                      {name || "Tu álbum"}
                    </span>
                  </p>
                  <div className="mt-4 flex h-32 w-32 items-center justify-center rounded-xl border border-dashed border-tinta/20 bg-arena/60">
                    <QrCode size={48} className="text-tinta/25" />
                  </div>
                  <p className="mt-3 text-[11px] leading-snug text-tinta/45">
                    Tu código QR aparecerá aquí en cuanto crees el álbum
                  </p>
                </div>
              </div>
            </div>

            <div className="glass-dark animate-float absolute -right-6 -top-6 flex items-center gap-1.5 rounded-2xl px-3 py-2 text-white shadow-lift">
              <Sparkles size={14} />
              <span className="text-xs font-semibold">Sin instalar nada</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
