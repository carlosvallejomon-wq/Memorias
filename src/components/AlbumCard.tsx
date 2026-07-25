import Link from "next/link";
import {
  CalendarHeart,
  Hourglass,
  ImageOff,
  Images,
  PenLine,
  ShieldCheck,
  Target,
  Users,
} from "lucide-react";

export type AlbumCardData = {
  id: string;
  name: string;
  kind: string;
  eventDate: string | null;
  moderationEnabled: boolean;
  mediaCount: number;
  pendingCount: number;
  peopleCount: number;
  challengeCount: number;
  messageCount: number;
  covers: { url: string; type: string }[];
};

function Cover({ covers }: { covers: { url: string; type: string }[] }) {
  if (covers.length === 0) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-arena via-crema to-oro/20 text-tinta/40">
        <ImageOff size={26} />
        <span className="text-xs font-semibold">Todavía sin fotos</span>
      </div>
    );
  }

  const [main, ...rest] = covers;
  return (
    <div className="flex h-full w-full gap-0.5">
      <div className="relative h-full flex-1 overflow-hidden bg-arena">
        <Media item={main} />
      </div>
      {rest.length > 0 && (
        <div className="flex h-full w-1/3 flex-col gap-0.5">
          {rest.slice(0, 2).map((c) => (
            <div key={c.url} className="relative flex-1 overflow-hidden bg-arena">
              <Media item={c} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Media({ item }: { item: { url: string; type: string } }) {
  if (item.type === "video") {
    return (
      <video
        src={item.url}
        className="h-full w-full object-cover"
        preload="metadata"
        muted
        playsInline
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={item.url} alt="" loading="lazy" className="h-full w-full object-cover" />
  );
}

// Tarjeta de álbum del panel: se ve de un vistazo la portada real, cuánta
// gente ha participado y si queda algo por revisar — antes solo había un
// icono y un número.
export function AlbumCard({ album }: { album: AlbumCardData }) {
  const dateLabel = album.eventDate
    ? new Date(album.eventDate + "T00:00:00").toLocaleDateString("es-ES", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : album.kind === "familia"
      ? "Álbum continuo de familia"
      : "Sin fecha";

  return (
    <Link
      href={`/dashboard/${album.id}`}
      className="card-interactive group block overflow-hidden rounded-2xl border border-tinta/10 bg-white shadow-soft"
    >
      <div className="zoom-hover relative h-40 overflow-hidden sm:h-44">
        <Cover covers={album.covers} />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <h3
            className="truncate text-lg font-semibold drop-shadow"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {album.name}
          </h3>
          <p className="flex items-center gap-1.5 text-xs text-white/80">
            <CalendarHeart size={12} /> {dateLabel}
          </p>
        </div>
        {album.pendingCount > 0 && (
          <span className="absolute right-3 top-3 flex items-center gap-1 rounded-full bg-teja px-2.5 py-1 text-xs font-semibold text-white shadow-lift">
            <Hourglass size={12} /> {album.pendingCount} por revisar
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 px-4 py-3 text-sm text-tinta/60">
        <span className="flex items-center gap-1.5">
          <Images size={14} className="text-teja" /> {album.mediaCount}{" "}
          {album.mediaCount === 1 ? "recuerdo" : "recuerdos"}
        </span>
        <span className="flex items-center gap-1.5">
          <Users size={14} className="text-teja" /> {album.peopleCount}{" "}
          {album.peopleCount === 1 ? "persona" : "personas"}
        </span>
        {album.challengeCount > 0 && (
          <span className="flex items-center gap-1.5">
            <Target size={14} className="text-teja" /> {album.challengeCount}{" "}
            {album.challengeCount === 1 ? "reto" : "retos"}
          </span>
        )}
        {album.messageCount > 0 && (
          <span className="flex items-center gap-1.5">
            <PenLine size={14} className="text-teja" /> {album.messageCount}{" "}
            {album.messageCount === 1 ? "mensaje" : "mensajes"}
          </span>
        )}
        {album.moderationEnabled && (
          <span className="ml-auto flex items-center gap-1 rounded-full bg-arena px-2 py-0.5 text-xs font-semibold text-tinta/60">
            <ShieldCheck size={12} /> Moderado
          </span>
        )}
      </div>
    </Link>
  );
}
