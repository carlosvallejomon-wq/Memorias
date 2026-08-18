import type Stripe from "stripe";
import { db } from "@/db";
import { purchases } from "@/db/schema";

export async function recordStripePurchase(session: Stripe.Checkout.Session) {
  const ownerId = session.metadata?.ownerId || session.client_reference_id;
  if (!ownerId || session.payment_status !== "paid") return false;

  await db()
    .insert(purchases)
    .values({
      ownerId,
      stripeSessionId: session.id,
      status: "paid",
      amount: session.amount_total,
    })
    .onConflictDoUpdate({
      target: purchases.stripeSessionId,
      set: { status: "paid", amount: session.amount_total },
    });
  return true;
}
