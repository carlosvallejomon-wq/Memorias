import Stripe from "stripe";

export function stripeEnabled() {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe no está configurado todavía.");
  return new Stripe(key);
}

export function publicSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://memorias-ten.vercel.app";
}
