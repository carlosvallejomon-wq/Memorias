import { Music, PenLine } from "lucide-react";
import { DeleteGuestbookEntryButton } from "@/components/OwnerActions";

export type GuestbookRow = {
  id: string;
  authorName: string | null;
  body: string;
  /** "deseo" son dedicatorias; "cancion", las que piden para la fiesta. */
  kind?: string;
  createdAt: Date;
};

// Los mensajes del muro tal como los ve el organizador: puede leerlos todos y
// borrar el que no le encaje. Se imprimen también en el Dotbook.
export function GuestbookPanel({ entries }: { entries: GuestbookRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <PenLine size={18} className="text-vino" /> Muro de dedicatorias y canciones
        <span className="font-normal text-tinta/40">({entries.length})</span>
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-tinta/50">
          Aún no hay nada. Tus invitados pueden escribir dedicatorias desde la
          pestaña «Dedicatorias» del álbum —saldrán impresas en el Dotbook— y
          sugerir canciones desde la invitación.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id} className="nota rounded-2xl p-4">
              {entry.kind === "cancion" && (
                <p className="mb-1.5 inline-flex items-center gap-1 rounded-full bg-vino/10 px-2 py-0.5 text-[11px] font-semibold text-vino">
                  <Music size={11} /> Canción sugerida
                </p>
              )}
              <p className="text-sm whitespace-pre-line">{entry.body}</p>
              <div className="mt-3 flex items-center justify-between gap-2 text-xs text-tinta/50">
                <span className="min-w-0 truncate">
                  <span className="font-semibold text-tinta/70">
                    {entry.authorName || "Anónimo"}
                  </span>{" "}
                  ·{" "}
                  {entry.createdAt.toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                  })}
                </span>
                <DeleteGuestbookEntryButton entryId={entry.id} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
