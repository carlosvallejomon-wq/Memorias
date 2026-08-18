import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { recordStripePurchase } from "@/lib/stripe-purchase";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !secret) return new NextResponse("Webhook no configurado", { status: 400 });

  try {
    const event = getStripe().webhooks.constructEvent(await request.text(), signature, secret);
    if (event.type === "checkout.session.completed") {
      await recordStripePurchase(event.data.object as Stripe.Checkout.Session);
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("Webhook de Stripe rechazado:", err);
    return new NextResponse("Firma inválida", { status: 400 });
  }
}
