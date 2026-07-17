import type { Metadata, Viewport } from "next";
import { Fraunces } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Memorias Vivas",
  description:
    "Álbumes compartidos de eventos: los invitados suben fotos y vídeos desde el móvil, sin instalar nada y sin registrarse.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es" className={fraunces.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
