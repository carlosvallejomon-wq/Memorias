// Tipos compartidos por las piezas de la página pública del invitado
// (galería, retos, muro de mensajes y visor).

export type MediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
  /** Fotograma de portada de los vídeos. Los subidos antes no lo tienen. */
  posterUrl: string | null;
  uploaderName: string | null;
  uploaderId: string | null;
  challengeId: string | null;
  approved: boolean;
  takenAt: string | null;
  createdAt: string;
  commentCount: number;
  reactions: Record<string, number>;
  myReactions: string[];
};

export type Comment = {
  id: string;
  authorName: string | null;
  /** UUID de quien lo escribió, para que pueda borrarlo él mismo. */
  guestId: string | null;
  body: string;
  createdAt: string;
};

export type ChallengeItem = {
  id: string;
  title: string;
  emoji: string | null;
  photoCount: number;
};

export type GuestbookItem = {
  id: string;
  authorName: string | null;
  guestId: string | null;
  body: string;
  createdAt: string;
};

export const EMOJIS = ["❤️", "😂", "😮", "👏"];

// Texto alternativo para lectores de pantalla. No sabemos qué sale en la foto,
// pero sí quién la subió y cuándo, que es mejor que nada.
export function mediaAlt(item: Pick<MediaItem, "type" | "uploaderName" | "takenAt" | "createdAt">): string {
  const qué = item.type === "video" ? "Vídeo" : "Foto";
  const quién = item.uploaderName?.trim();
  const cuándo = new Date(item.takenAt ?? item.createdAt).toLocaleDateString("es-ES", {
    day: "numeric",
    month: "long",
  });
  return quién ? `${qué} de ${quién}, ${cuándo}` : `${qué} del ${cuándo}`;
}

export function reactionTotal(item: MediaItem): number {
  return Object.values(item.reactions).reduce((a, b) => a + b, 0);
}

// «hace 5 min», «ayer»… más humano que una fecha completa en un comentario.
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "ahora mismo";
  if (mins < 60) return `hace ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `hace ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "ayer";
  if (days < 30) return `hace ${days} días`;
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long" });
}

// Inicial para los avatares de colores: evita pedir fotos de perfil a gente
// que ni siquiera tiene cuenta.
export function initial(name: string | null): string {
  const trimmed = (name ?? "").trim();
  return trimmed ? trimmed[0].toUpperCase() : "?";
}

// Color estable derivado del nombre, para que cada persona tenga siempre el
// mismo tono en toda la app.
export function avatarColor(name: string | null): string {
  const palette = ["#c2571b", "#6b2737", "#6b7a45", "#2f6b6b", "#8a5a2b", "#4a4a7a"];
  const key = (name ?? "").trim();
  if (!key) return "#8a8072";
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return palette[hash % palette.length];
}

// Descarga un archivo del Blob. El atributo `download` no funciona entre
// dominios distintos, así que se baja el archivo y se guarda desde memoria;
// si algo falla, se abre en una pestaña nueva (el invitado siempre puede
// guardarlo a mano).
export async function downloadMedia(url: string, filename: string) {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
  } catch {
    window.open(url, "_blank", "noreferrer");
  }
}
