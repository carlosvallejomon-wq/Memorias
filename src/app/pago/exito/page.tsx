import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { getStripe, stripeEnabled } from "@/lib/stripe";
import { recordStripePurchase } from "@/lib/stripe-purchase";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  const { userId } = await auth();
  let paid = false;

  if (userId && session_id && stripeEnabled()) {
    try {
      const session = await getStripe().checkout.sessions.retrieve(session_id);
      if (session.client_reference_id === userId) paid = await recordStripePurchase(session);
    } catch (err) {
      console.error("No se pudo confirmar el pago de vuelta:", err);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-xl items-center px-6 py-16 text-center">
      <div className="w-full rounded-3xl border border-tinta/10 bg-white p-8 shadow-lift">
        <img src="/brand/memorias-vivas-logo.png" alt="Memorias Vivas" className="mx-auto mb-5 h-16 w-16 rounded-2xl object-cover shadow-soft" />
        <CheckCircle2 size={48} className="mx-auto text-teja" />
        <p className="mt-5 text-xs font-semibold uppercase tracking-[0.14em] text-teja">Memorias Vivas</p>
        <h1 className="mt-2 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {paid ? "Tu pago está confirmado" : "Estamos confirmando tu pago"}
        </h1>
        <p className="mt-3 text-tinta/60">
          {paid ? "Ya puedes crear tu álbum y compartirlo con tus invitados." : "Si acabas de pagar, espera unos segundos y vuelve a abrir esta página."}
        </p>
        <Link href="/dashboard/nuevo" className="btn btn-primary shimmer mt-7 px-6 py-3">
          Crear mi álbum <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  );
}
