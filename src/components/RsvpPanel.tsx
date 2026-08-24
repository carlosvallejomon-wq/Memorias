import { CheckCircle2, UsersRound, XCircle } from "lucide-react";

export type RsvpRow = {
  id: string;
  guestName: string;
  attending: boolean;
  partySize: number;
  note: string | null;
  createdAt: Date;
};

// Panel del organizador: las respuestas se capturan desde la invitación y no
// se exponen a otros invitados. Más adelante este mismo listado se podrá
// habilitar exclusivamente para el plan Premium.
export function RsvpPanel({ entries }: { entries: RsvpRow[] }) {
  const attending = entries.filter((entry) => entry.attending);
  const people = attending.reduce((total, entry) => total + entry.partySize, 0);
  const declined = entries.length - attending.length;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-semibold">
            <UsersRound size={18} className="text-teja" /> Confirmaciones de asistencia
          </h2>
          <p className="mt-1 text-sm text-tinta/50">Las respuestas llegan desde la invitación digital.</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="rounded-full bg-teja/10 px-3 py-1.5 text-teja-oscuro">{people} asistentes</span>
          <span className="rounded-full bg-tinta/5 px-3 py-1.5 text-tinta/60">{declined} no asistirán</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-tinta/50">Activa «Confirmación automática RSVP» al generar el enlace de una invitación para empezar a recibir respuestas.</p>
      ) : (
        <ul className="mt-3 grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => (
            <li key={entry.id} className="rounded-2xl border border-tinta/10 bg-white p-4 shadow-soft">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{entry.guestName}</p>
                  {entry.note && <p className="mt-1 text-sm text-tinta/60">{entry.note}</p>}
                </div>
                {entry.attending ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-teja-oscuro"><CheckCircle2 size={15} /> {entry.partySize} {entry.partySize === 1 ? "persona" : "personas"}</span>
                ) : (
                  <span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-tinta/50"><XCircle size={15} /> No asiste</span>
                )}
              </div>
              <p className="mt-3 text-xs text-tinta/40">{entry.createdAt.toLocaleDateString("es-ES", { day: "numeric", month: "short" })}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
