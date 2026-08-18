import Link from "next/link";
import { Check, Heart, Sparkles } from "lucide-react";
import { BuyAlbumButton } from "@/components/BuyAlbumButton";

export function PricingSection({ lang }: { lang: "es" | "en" }) {
  const en = lang === "en";
  const paymentsEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
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
    <section id="precios" className="bg-arena/40 py-20">
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

        <div className="mx-auto mt-10 grid max-w-4xl overflow-hidden rounded-[2rem] border border-tinta/10 bg-white shadow-lift md:grid-cols-[0.9fr_1.1fr]">
          <div className="relative overflow-hidden bg-tinta px-7 py-9 text-crema sm:px-10 sm:py-11">
            <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full border border-crema/15" />
            <div className="absolute -bottom-16 -left-14 h-52 w-52 rounded-full border border-crema/10" />
            <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-teja text-white shadow-soft">
              <Sparkles size={22} />
            </span>
            <p className="relative mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-crema/60">
              {en ? "One complete event" : "Un evento completo"}
            </p>
            <p className="relative mt-2 text-6xl font-semibold leading-none" style={{ fontFamily: "var(--font-display)" }}>
              $39
            </p>
            <p className="relative mt-3 max-w-[15rem] text-sm leading-relaxed text-crema/70">
              {en ? "One payment. No subscription and no surprise charges." : "Un solo pago. Sin suscripción ni cargos sorpresa."}
            </p>
            <div className="relative mt-8 flex items-center gap-2 text-sm font-medium text-crema/85">
              <Heart size={15} className="text-teja" />
              {en ? "Made for memories that matter" : "Hecho para recuerdos que importan"}
            </div>
          </div>

          <div className="px-7 py-9 sm:px-10 sm:py-11">
            <p className="text-sm font-semibold uppercase tracking-[0.13em] text-teja">
              {en ? "Everything included" : "Todo incluido"}
            </p>
            <h3 className="mt-2 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              {en ? "Your celebration, beautifully kept" : "Tu celebración, guardada para siempre"}
            </h3>
            <ul className="mt-6 grid gap-3 text-sm text-tinta/75 sm:grid-cols-2">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-2.5">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teja/15 text-teja-oscuro">
                    <Check size={12} />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
            <div className="mt-8">
              {paymentsEnabled ? (
                <BuyAlbumButton english={en} />
              ) : (
                <Link href="/dashboard" className="btn btn-primary shimmer w-full px-6 py-3">
                  {en ? "Create my event album" : "Crear mi álbum"}
                </Link>
              )}
            </div>
            <p className="mt-3 text-center text-xs text-tinta/45">
              {en ? "Sign in only when you are ready to create your album." : "Solo iniciarás sesión cuando estés listo para crear tu álbum."}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
