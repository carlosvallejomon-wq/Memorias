// Prepara los archivos del invitado antes de subirlos, en su propio navegador.
//
// Resuelve dos problemas que rompían la galería en un evento real:
//
//  1. Los iPhone guardan las fotos en HEIC, que Chrome y Android NO saben
//     mostrar. Aquí se convierten a JPG antes de salir del móvil, así que en
//     el servidor solo entran formatos que todo el mundo ve (y que además el
//     Dotbook puede incrustar directamente).
//  2. Los vídeos no tienen imagen de portada, y la galería enseñaba
//     rectángulos negros hasta descargar el vídeo entero. Aquí se saca un
//     fotograma y se sube como miniatura aparte.

export type PreparedUpload = {
  /** El archivo que se sube de verdad (ya convertido si hacía falta). */
  file: File;
  /** Miniatura del vídeo, si se pudo sacar. */
  poster: File | null;
  /** true si el original era HEIC y se convirtió. */
  converted: boolean;
};

const HEIC_EXT = /\.(heic|heif)$/i;

/** Reconoce un HEIC por la extensión o por el tipo que declara el móvil. */
export function looksLikeHeic(file: File): boolean {
  const type = (file.type || "").toLowerCase();
  if (type === "image/heic" || type === "image/heif") return true;
  if (type === "image/heic-sequence" || type === "image/heif-sequence") return true;
  return HEIC_EXT.test(file.name);
}

export function isVideo(file: File): boolean {
  return (file.type || "").startsWith("video/") || /\.(mp4|mov|m4v|webm|avi)$/i.test(file.name);
}

function renameTo(name: string, ext: string): string {
  const base = name.replace(/\.[^.]+$/, "");
  return `${base || "foto"}.${ext}`;
}

/**
 * Convierte un HEIC a JPG. La librería que descodifica HEIC pesa unos 3 MB,
 * así que se carga con `import()` dinámico: solo la descargan los móviles que
 * de verdad suben un HEIC, y una sola vez.
 */
async function heicToJpeg(file: File): Promise<File> {
  const { heicTo } = await import("heic-to/next");
  const blob = await heicTo({ blob: file, type: "image/jpeg", quality: 0.92 });
  return new File([blob], renameTo(file.name, "jpg"), {
    type: "image/jpeg",
    lastModified: file.lastModified,
  });
}

const POSTER_MAX = 1280;

/**
 * Saca un fotograma del vídeo para usarlo de portada. Si el navegador no
 * puede (códec raro, política de autoplay, etc.) devuelve null y la galería
 * sigue funcionando como hasta ahora.
 */
export function createVideoPoster(file: File): Promise<File | null> {
  return new Promise((resolve) => {
    let settled = false;
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    const finish = (result: File | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      video.removeAttribute("src");
      video.load();
      URL.revokeObjectURL(url);
      resolve(result);
    };

    // Red de seguridad: si el navegador se queda colgado, seguimos sin
    // miniatura en vez de bloquear la subida.
    const timer = setTimeout(() => finish(null), 8000);

    video.onerror = () => finish(null);

    video.onloadedmetadata = () => {
      // Un cuarto de vídeo (como mucho el segundo 1) suele ser un fotograma
      // con contenido; el 0 muchas veces es negro.
      const target = Math.min(1, (video.duration || 4) * 0.25);
      video.currentTime = Number.isFinite(target) ? target : 0;
    };

    video.onseeked = () => {
      try {
        const w = video.videoWidth;
        const h = video.videoHeight;
        if (!w || !h) return finish(null);
        const scale = Math.min(1, POSTER_MAX / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(w * scale);
        canvas.height = Math.round(h * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            if (!blob) return finish(null);
            finish(
              new File([blob], renameTo(file.name, "portada.jpg"), {
                type: "image/jpeg",
                lastModified: file.lastModified,
              }),
            );
          },
          "image/jpeg",
          0.82,
        );
      } catch {
        finish(null);
      }
    };

    video.src = url;
  });
}

export async function prepareForUpload(file: File): Promise<PreparedUpload> {
  if (looksLikeHeic(file)) {
    try {
      return { file: await heicToJpeg(file), poster: null, converted: true };
    } catch (err) {
      // Si la conversión falla subimos el original: mejor una foto que Safari
      // sí muestra que perder el recuerdo.
      console.error("No se pudo convertir el HEIC:", err);
      return { file, poster: null, converted: false };
    }
  }

  if (isVideo(file)) {
    return { file, poster: await createVideoPoster(file), converted: false };
  }

  return { file, poster: null, converted: false };
}
