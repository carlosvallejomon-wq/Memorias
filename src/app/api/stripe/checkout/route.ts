import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getStripe, publicSiteUrl, stripeEnabled } from "@/lib/stripe";

async function createCheckoutUrl(userId: string) {
  if (!stripeEnabled()) throw new Error("El pago estará disponible muy pronto.");

  try {
    const stripe = getStripe();
    const site = publicSiteUrl();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // Permite un cupón de un solo uso para pruebas o campañas puntuales.
      // El precio y el cobro siguen siendo controlados por Stripe.
      allow_promotion_codes: true,
      // Cada sesión conserva la identidad visual aunque en Stripe se haya
      // configurado otra marca para recibos o el portal de clientes.
      branding_settings: {
        background_color: "#FFF9F4",
        button_color: "#C95A19",
        border_style: "rounded",
        font_family: "lora",
        display_name: "Memorias Vivas",
      },
      client_reference_id: userId,
      metadata: { ownerId: userId, product: "event_album" },
      line_items: process.env.STRIPE_PRICE_ID
        ? [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }]
        : [{ price_data: { currency: "usd", product_data: { name: "Memorias Vivas · Álbum de evento" }, unit_amount: 3900 }, quantity: 1 }],
      success_url: `${site}/pago/exito?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${site}/#precios`,
    });
    if (!session.url) throw new Error("Stripe no devolvió una página de pago.");
    return session.url;
  } catch (err) {
    console.error("No se pudo crear Checkout:", err);
    // Stripe devuelve mensajes concretos para problemas de precio, permisos o
    // configuración. Son seguros de mostrar al organizador y evitan dejarle
    // con un mensaje genérico imposible de corregir.
    const detail = err instanceof Error ? err.message : "Error desconocido";
    throw new Error(`No se pudo abrir el pago seguro: ${detail}`);
  }
}

export async function GET(req: Request) {
  // Un enlace normal funciona antes de que React termine de cargar en móvil.
  // Así el CTA no necesita un segundo toque ni depende de un evento cliente.
  try {
    const { userId } = await auth();
    if (!userId) {
      const signIn = new URL("/sign-in", req.url);
      signIn.searchParams.set("redirect_url", new URL(req.url).toString());
      return NextResponse.redirect(signIn);
    }
    return NextResponse.redirect(await createCheckoutUrl(userId));
  } catch (err) {
    console.error("No se pudo iniciar el pago desde el enlace:", err);
    return NextResponse.redirect(new URL("/?checkout_error=1#precios", req.url));
  }
}

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: "Inicia sesión para comprar tu álbum." }, { status: 401 });
    return NextResponse.json({ url: await createCheckoutUrl(userId) });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
