import Link from "next/link";
import { Check, Sparkles } from "lucide-react";

export function PricingSection({ lang }: { lang: "es" | "en" }) {
  const en = lang === "en";
  const features = en
    ? [
        "Private event album with QR code",
        "Unlimited guests, photos and videos",
        "Digital invitations and 140+ templates",
        "Live screen, reactions and guest messages",
        "ZIP download and designed Dotbook PDF",
      ]
    : [
        "Álbum privado del evento con código QR",
        "Invitados, fotos y vídeos sin límite práctico",
        "Invitaciones digitales y más de 140 plantillas",
        "Modo pantalla, reacciones y dedicatorias",
        "Descarga ZIP y Dotbook PDF con diseño",
      ];

  return (
    <section id="precios" className="border-y border-tinta/8 bg-arena/40 py-20">
      <div className="mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teja">
            {en ? "Simple, one-time price" : "Un precio simple, un solo pago"}
          </p>
          <h2
            className="text-balance mt-2 text-3xl font-semibold sm:text-4xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {en ? "Everything your event needs to be remembered" : "Todo lo que tu evento necesita para quedarse en el recuerdo"}
          </h2>
          <p className="mt-3 text-tinta/60">
            {en
              ? "No subscriptions. Your guests never need to download an app or create an account."
              : "Sin suscripciones. Tus invitados nunca necesitan instalar una app ni crear una cuenta."}
          </p>
        </div>

        <div className="mx-auto mt-10 max-w-md rounded-3xl border border-teja/25 bg-white p-7 text-center shadow-lift">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teja text-white shadow-soft">
            <Sparkles size={22} />
          </span>
          <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-teja">
            {en ? "Event album" : "Álbum de evento"}
          </p>
          <p className="mt-2 text-5xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            $39
          </p>
          <p className="mt-1 text-sm text-tinta/50">
            {en ? "one-time payment per event" : "un solo pago por evento"}
          </p>
          <ul className="mt-6 space-y-3 text-left text-sm text-tinta/75">
            {features.map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teja/15 text-teja-oscuro">
                  <Check size={12} />
                </span>
                {feature}
              </li>
            ))}
          </ul>
          <Link href="/dashboard" className="btn btn-primary shimmer mt-7 w-full px-6 py-3">
            {en ? "Create my event album" : "Crear mi álbum"}
          </Link>
        </div>
      </div>
    </section>
  );
}
