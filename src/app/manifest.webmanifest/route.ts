import { NextResponse } from "next/server";

// Permite "añadir a la pantalla de inicio" en el móvil con nombre e icono
// propios, en vez del recorte de pantalla genérico que ponía el navegador.
export function GET() {
  return NextResponse.json({
    name: "Memorias Vivas",
    short_name: "Memorias",
    description:
      "Álbumes compartidos de eventos: los invitados suben fotos y vídeos desde el móvil.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#faf6f0",
    theme_color: "#faf6f0",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  });
}
