import { ImageResponse } from "next/og";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { albums, media } from "@/db/schema";

export const dynamic = "force-dynamic";
export const alt = "Álbum de fotos compartido";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Imagen que sale al pegar el enlace del álbum en WhatsApp, Instagram o
// Telegram. Se dibuja al vuelo con las últimas fotos del propio álbum, así
// que cada evento tiene su propia portada sin que nadie prepare nada.
export default async function Image({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const [album] = await db()
    .select({
      id: albums.id,
      name: albums.name,
      eventDate: albums.eventDate,
      pinHash: albums.pinHash,
    })
    .from(albums)
    .where(eq(albums.shareCode, code));

  // Si el álbum tiene código de acceso, la vista previa enseña el nombre pero
  // no las fotos: no tendría sentido pedir un código y luego filtrarlas en la
  // miniatura de WhatsApp.
  const fotos =
    album && !album.pinHash
      ? await db()
          .select({ url: media.url, posterUrl: media.posterUrl, type: media.type })
          .from(media)
          .where(and(eq(media.albumId, album.id), eq(media.approved, true)))
          .orderBy(desc(media.createdAt))
          .limit(3)
      : [];

  // Solo URLs absolutas: con una relativa el generador de imágenes falla y
  // WhatsApp se quedaría sin vista previa. Mejor una tarjeta sin fotos que
  // ninguna tarjeta.
  const miniaturas = fotos
    .map((f) => (f.type === "video" ? f.posterUrl : f.url))
    .filter((u): u is string => !!u && /^https?:\/\//.test(u));

  const fecha = album?.eventDate
    ? new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

  const tarjeta = (conFotos: boolean) => (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#faf6f0",
          padding: 64,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: "#2b2118",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#faf6f0",
              fontSize: 22,
            }}
          >
            ●
          </div>
          <div style={{ fontSize: 26, color: "#2b2118", opacity: 0.6 }}>Memorias Vivas</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              fontSize: album && album.name.length > 28 ? 62 : 78,
              fontWeight: 700,
              color: "#2b2118",
              lineHeight: 1.05,
            }}
          >
            {album?.name ?? "Álbum de recuerdos"}
          </div>
          <div style={{ fontSize: 30, color: "#c2571b" }}>
            {fecha ?? "Sube tus fotos del evento"}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ fontSize: 28, color: "#2b2118", opacity: 0.65, maxWidth: 620 }}>
            Añade tus fotos y vídeos desde el móvil. Sin instalar nada, sin registrarte.
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            {(conFotos ? miniaturas : []).map((url) => (
              // eslint-disable-next-line jsx-a11y/alt-text
              <img
                key={url}
                src={url}
                width={150}
                height={150}
                style={{ borderRadius: 18, objectFit: "cover" }}
              />
            ))}
          </div>
        </div>
      </div>
  );

  try {
    return new ImageResponse(tarjeta(true), size);
  } catch (err) {
    // Si una de las fotos no se puede descargar, se manda la tarjeta sin
    // ellas en vez de devolver un error y dejar el enlace pelado.
    console.error("No se pudo montar la vista previa con fotos:", err);
    return new ImageResponse(tarjeta(false), size);
  }
}
