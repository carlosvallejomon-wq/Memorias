import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import { WhatsAppSupport } from "@/components/WhatsAppSupport";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const DESCRIPCION =
  "Álbumes compartidos de eventos: los invitados suben fotos y vídeos desde el móvil, sin instalar nada y sin registrarse.";

// `metadataBase` hace que las imágenes de vista previa salgan con URL
// absoluta. En Vercel la variable VERCEL_URL viene puesta sola; en local se
// usa el puerto de desarrollo.
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL
  ? new URL(process.env.NEXT_PUBLIC_SITE_URL)
  : process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`)
    : process.env.VERCEL_URL
      ? new URL(`https://${process.env.VERCEL_URL}`)
      : new URL("http://localhost:3000");

export const metadata: Metadata = {
  metadataBase: baseUrl,
  title: {
    default: "Memorias Vivas · el álbum de fotos de tu evento",
    template: "%s · Memorias Vivas",
  },
  description: DESCRIPCION,
  applicationName: "Memorias Vivas",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Memorias Vivas", statusBarStyle: "default" },
  // Sin esto, mandar el enlace por WhatsApp enseñaba una URL pelada, sin
  // título ni foto: parecía spam justo en el momento en que el organizador
  // necesita que sus invitados se fíen y entren.
  openGraph: {
    type: "website",
    siteName: "Memorias Vivas",
    locale: "es_ES",
    title: "Memorias Vivas · el álbum de fotos de tu evento",
    description: DESCRIPCION,
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#faf6ef",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={fraunces.variable}>
      <body className="min-h-screen antialiased">
        {children}
        <WhatsAppSupport />
      </body>
    </html>
  );
}
