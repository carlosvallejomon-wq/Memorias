import {
  CalendarDays,
  Heart,
  Images,
  MessageCircle,
  PenLine,
  Trophy,
  Users,
} from "lucide-react";

export type AlbumStatsData = {
  mediaCount: number;
  photoCount: number;
  videoCount: number;
  peopleCount: number;
  dayCount: number;
  reactionCount: number;
  commentCount: number;
  messageCount: number;
  topContributors: { name: string; count: number }[];
  topMedia: { url: string; type: string; uploaderName: string | null; score: number } | null;
};

const MEDALS = ["🥇", "🥈", "🥉"];

function Tile({
  icon: Icon,
  value,
  label,
  hint,
}: {
  icon: typeof Images;
  value: number;
  label: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-tinta/10 bg-white p-4 shadow-soft">
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-teja/20 to-teja/5 text-teja-oscuro">
        <Icon size={16} />
      </div>
      <p
        className="mt-3 text-2xl leading-none font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-tinta/60">{label}</p>
      {hint && <p className="text-xs text-tinta/40">{hint}</p>}
    </div>
  );
}

// Resumen del evento para el organizador: números grandes, quién ha
// participado más y qué recuerdo ha gustado más. Es lo primero que uno quiere
// saber al abrir el álbum el día después de la fiesta.
export function AlbumStats({ stats }: { stats: AlbumStatsData }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <Trophy size={18} className="text-oro" /> Resumen del evento
      </h2>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Tile
          icon={Images}
          value={stats.mediaCount}
          label="recuerdos"
          hint={`${stats.photoCount} fotos · ${stats.videoCount} vídeos`}
        />
        <Tile icon={Users} value={stats.peopleCount} label="personas han subido" />
        <Tile icon={CalendarDays} value={stats.dayCount} label="días con recuerdos" />
        <Tile icon={Heart} value={stats.reactionCount} label="reacciones" />
        <Tile icon={MessageCircle} value={stats.commentCount} label="comentarios" />
        <Tile icon={PenLine} value={stats.messageCount} label="dedicatorias" />
      </div>

      {(stats.topContributors.length > 0 || stats.topMedia) && (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          {stats.topContributors.length > 0 && (
            <div className="rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft">
              <h3 className="text-sm font-semibold text-tinta/70">
                Quién ha compartido más
              </h3>
              <ul className="mt-3 space-y-2">
                {stats.topContributors.map((c, i) => (
                  <li key={c.name} className="flex items-center gap-3">
                    <span className="w-6 text-center text-lg">{MEDALS[i] ?? "·"}</span>
                    <span className="min-w-0 flex-1 truncate font-medium">{c.name}</span>
                    <span className="shrink-0 text-sm text-tinta/50">
                      {c.count} {c.count === 1 ? "recuerdo" : "recuerdos"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.topMedia && (
            <div className="flex items-center gap-4 rounded-2xl border border-tinta/10 bg-white p-5 shadow-soft">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-arena shadow-soft">
                {stats.topMedia.type === "video" ? (
                  <video
                    src={stats.topMedia.url}
                    className="h-full w-full object-cover"
                    preload="metadata"
                    muted
                    playsInline
                  />
                ) : (
                   
                  <img
                    src={stats.topMedia.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-tinta/70">
                  El recuerdo más querido
                </h3>
                <p className="mt-1 flex items-center gap-1.5 text-lg font-semibold">
                  <Heart size={16} className="text-teja" /> {stats.topMedia.score}
                </p>
                <p className="truncate text-sm text-tinta/50">
                  {stats.topMedia.uploaderName
                    ? `Lo subió ${stats.topMedia.uploaderName}`
                    : "Subido por un invitado anónimo"}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
