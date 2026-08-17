// Los enlaces que se mandan a invitados no deben heredar una URL temporal de
// Vercel. La variable permite cambiar al dominio propio más adelante; mientras
// tanto todos los QR usan siempre el dominio corto de la aplicación.
const DEFAULT_PUBLIC_SITE_URL = "https://memorias-ten.vercel.app";

export function publicSiteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? DEFAULT_PUBLIC_SITE_URL).replace(/\/$/, "");
}
