"use client";

import { useEffect, useState } from "react";
import { Loader2, PenLine, Send, Trash2 } from "lucide-react";
import {
  type GuestbookItem,
  avatarColor,
  initial,
  timeAgo,
} from "@/lib/guest-types";

// Ligera inclinación distinta para cada nota, para que el muro parezca un
// tablón de papelitos y no una tabla.
const TILTS = ["-1.4deg", "0.9deg", "-0.6deg", "1.5deg", "-1.1deg", "0.4deg"];

export function GuestMessageWall({
  code,
  guestId,
  guestName,
  onCountChange,
}: {
  code: string;
  guestId: string;
  guestName: string;
  onCountChange?: (n: number) => void;
}) {
  const [entries, setEntries] = useState<GuestbookItem[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/guest/${code}/guestbook`)
      .then((r) => r.json())
      .then((data: { items: GuestbookItem[] }) => {
        setEntries(data.items);
        onCountChange?.(data.items.length);
      })
      .catch(() => setEntries([]));
    // onCountChange se omite a propósito: solo interesa la carga inicial.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/guest/${code}/guestbook`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          authorName: guestName || null,
          guestId: guestId || null,
          body: text,
        }),
      });
      if (res.ok) {
        const data = (await res.json()) as { item: GuestbookItem };
        setEntries((prev) => {
          const next = [data.item, ...(prev ?? [])];
          onCountChange?.(next.length);
          return next;
        });
        setDraft("");
      }
    } finally {
      setSending(false);
    }
  }

  async function remove(entry: GuestbookItem) {
    if (!confirm("¿Borrar tu dedicatoria?")) return;
    setEntries((prev) => {
      const next = (prev ?? []).filter((e) => e.id !== entry.id);
      onCountChange?.(next.length);
      return next;
    });
    await fetch(
      `/api/guestbook/${entry.id}?guestId=${encodeURIComponent(guestId)}`,
      { method: "DELETE" },
    );
  }

  return (
    <div className="mt-6">
      <form onSubmit={send} className="glass rounded-2xl p-4">
        <h2
          className="flex items-center gap-2 font-semibold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          <PenLine size={17} className="text-teja" /> Deja tu dedicatoria
        </h2>
        <p className="mt-1 text-sm text-tinta/60">
          Un recuerdo, una felicitación, una anécdota… Se guardará en el álbum y
          saldrá impresa en el libro de recuerdos.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          maxLength={2000}
          placeholder="Escribe aquí tu dedicatoria…"
          className="field mt-3 resize-y"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="text-xs text-tinta/40">
            {guestName ? `Firmarás como ${guestName}` : "Firmarás como Anónimo"}
          </span>
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="btn btn-primary shimmer"
          >
            {sending ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            Firmar
          </button>
        </div>
      </form>

      {entries === null ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="skeleton h-28 rounded-2xl" />
          <div className="skeleton h-28 rounded-2xl" />
        </div>
      ) : entries.length === 0 ? (
        <p className="mt-8 text-center text-tinta/50">
          Todavía no hay dedicatorias. La tuya puede ser la primera.
        </p>
      ) : (
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {entries.map((entry, i) => (
            <li
              key={entry.id}
              className="nota animate-fade-in rounded-2xl p-4"
              style={{ transform: `rotate(${TILTS[i % TILTS.length]})` }}
            >
              <p className="text-[15px] leading-relaxed whitespace-pre-line">
                {entry.body}
              </p>
              <div className="mt-3 flex items-center gap-2 border-t border-tinta/8 pt-3">
                <span
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                  style={{ backgroundColor: avatarColor(entry.authorName) }}
                >
                  {initial(entry.authorName)}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">
                  <span className="font-semibold">
                    {entry.authorName || "Anónimo"}
                  </span>{" "}
                  <span className="text-tinta/40">· {timeAgo(entry.createdAt)}</span>
                </span>
                {!!guestId && entry.guestId === guestId && (
                  <button
                    onClick={() => remove(entry)}
                    title="Borrar mi dedicatoria"
                    className="shrink-0 rounded-full p-1.5 text-tinta/30 transition hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
