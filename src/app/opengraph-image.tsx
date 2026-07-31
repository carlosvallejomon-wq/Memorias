import { ImageResponse } from "next/og";

export const alt = "Memorias Vivas · el álbum de fotos de tu evento";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Vista previa de la portada al compartirla (WhatsApp, Telegram, redes).
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          background: "#faf6f0",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ fontSize: 28, color: "#2b2118", opacity: 0.55 }}>Memorias Vivas</div>
        <div style={{ fontSize: 84, fontWeight: 700, color: "#2b2118", lineHeight: 1.05 }}>
          Todas las fotos de tu evento,
        </div>
        <div style={{ fontSize: 84, fontWeight: 700, color: "#c2571b", lineHeight: 1.05 }}>
          en un solo álbum
        </div>
        <div style={{ fontSize: 32, color: "#2b2118", opacity: 0.65, marginTop: 12 }}>
          Tus invitados suben sus fotos con un QR. Sin instalar nada, sin registrarse.
        </div>
      </div>
    ),
    size,
  );
}
