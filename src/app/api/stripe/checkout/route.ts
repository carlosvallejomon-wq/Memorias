import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe, publicSiteUrl, stripeEnabled } from "@/lib/stripe";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "Inicia sesión para comprar tu álbum." }, { status: 401 });
  if (!stripeEnabled()) return NextResponse.json({ error: "El pago estará disponible muy pronto." }, { status: 503 });

  try {
    const stripe = getStripe();
    const site = publicSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: userId,
      metadata: { ownerId: userId, product: "event_album" },
      line_items: process.env.STRIPE_PRICE_ID
        ? [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }]
        : [{ price_data: { currency: "usd", product_data: { name: "Memorias Vivas · Álbum de evento" }, unit_amount: 3900 }, quantity: 1 }],
      success_url: `${site}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/#precios`,
    });
    if (!session.url) throw new Error("Stripe no devolvió una página de pago.");
    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error("No se pudo crear Checkout:", err);
    // Stripe devuelve mensajes concretos para problemas de precio, permisos o
    // configuración. Son seguros de mostrar al organizador y evitan dejarle
    // con un mensaje genérico imposible de corregir.
    const detail = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: `No se pudo abrir el pago seguro: ${detail}` }, { status: 500 });
  }
}
