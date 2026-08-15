import { PenLine } from "lucide-react";
import { DeleteGuestbookEntryButton } from "@/components/OwnerActions";

export type GuestbookRow = {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: Date;
};

// Los mensajes del muro tal como los ve el organizador: puede leerlos todos y
// borrar el que no le encaje. Se imprimen también en el Dotbook.
export function GuestbookPanel({ entries }: { entries: GuestbookRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <PenLine size={18} className="text-vino" /> Muro de dedicatorias
        <span className="font-normal text-tinta/40">({entries.length})</span>
      </h2>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-tinta/50">
          Aún no hay dedicatorias. Tus invitados pueden escribirlas desde la
          pestaña «Dedicatorias» del álbum, y saldrán impresas en el Dotbook.
        </p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id} className="nota rounded-2xl p-4">
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
