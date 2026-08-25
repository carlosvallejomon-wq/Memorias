// Topes de subida. Sin ellos cualquiera con el enlace podía llenar el álbum
// (y la factura de almacenamiento) sin freno, porque los invitados no tienen
// cuenta y no hay nadie a quien reclamar.

/** Tamaño máximo por archivo. Un vídeo de móvil de 2-3 minutos cabe de sobra. */
export const MAX_FILE_BYTES = 150 * 1024 * 1024; // 150 MB

/** Miniatura de vídeo: la genera la propia app, siempre es pequeña. */
export const MAX_POSTER_BYTES = 4 * 1024 * 1024; // 4 MB

/**
 * Fotos que el organizador pone dentro de la invitación (portada y galería).
 * No son recuerdos del álbum: van aparte y son pocas, así que se les pide un
 * tamaño mucho más contenido que a las de los invitados.
 */
export const MAX_INVITATION_PHOTO_BYTES = 12 * 1024 * 1024; // 12 MB

/** Fotos como mucho en la galería de la invitación. */
export const MAX_INVITATION_PHOTOS = 6;

/** Recuerdos como mucho en un álbum. Una boda grande ronda los 1.500. */
export const MAX_ITEMS_PER_ALBUM = 5000;

/** Recuerdos como mucho por invitado, para que nadie acapare el álbum. */
export const MAX_ITEMS_PER_GUEST = 500;

export function formatMb(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}
