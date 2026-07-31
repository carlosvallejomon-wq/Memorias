import Link from "next/link";
import { ArrowLeft, Camera } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-tinta/50 transition hover:text-tinta"
      >
        <ArrowLeft size={15} /> Volver a la portada
      </Link>

      <article className="legal mt-6">{children}</article>

      <footer className="mt-12 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-tinta/10 pt-6 text-sm text-tinta/50">
        <span className="flex items-center gap-1.5">
          <Camera size={14} /> Memorias Vivas
        </span>
        <Link href="/legal/privacidad" className="transition hover:text-tinta">
          Privacidad
        </Link>
        <Link href="/legal/condiciones" className="transition hover:text-tinta">
          Condiciones de uso
        </Link>
      </footer>
    </main>
  );
}
