"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import {
  Camera,
  CalendarDays,
  LayoutGrid,
  X,
  Trash2,
  Hourglass,
  Sprout,
  MessageCircle,
  Play,
  Loader2,
  Upload,
} from "lucide-react";

type MediaItem = {
  id: string;
  url: string;
  type: "image" | "video";
  uploaderName: string | null;
  uploaderId: string | null;
  approved: boolean;
  takenAt: string | null;
  createdAt: string;
  commentCount: number;
  reactions: Record<string, number>;
  myReactions: string[];
};

type Comment = {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: string;
};

const EMOJIS = ["❤️", "😂", "😮", "👏"];

function useLocalValue(key: string, generate?: () => string) {
  const [value, setValue] = useState("");
  useEffect(() => {
    let v = localStorage.getItem(key) ?? "";
    if (!v && generate) {
      v = generate();
      localStorage.setItem(key, v);
    }
    setValue(v);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  const save = useCallback(
    (v: string) => {
      setValue(v);
      localStorage.setItem(key, v);
    },
    [key],
  );
  return [value, save] as const;
}

function itemDate(item: MediaItem): Date {
  return new Date(item.takenAt ?? item.createdAt);
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function dayLabel(key: string): string {
  return new Date(key + "T12:00:00").toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function GuestAlbum({
  code,
  name,
  eventDate,
}: {
  code: string;
  name: string;
  eventDate: string | null;
}) {
  const [guestId] = useLocalValue("mv_guest_id", () => crypto.randomUUID());
  const [guestName, setGuestName] = useLocalValue("mv_guest_name");
  const [askName, setAskName] = useState(false);
  const [items, setItems] = useState<MediaItem[] | null>(null);
  const [view, setView] = useState<"galeria" | "dias">("galeria");
  const [uploading, setUploading] = useState<{ done: number; total: number } | null>(null);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
  const [pendingDate, setPendingDate] = useState(eventDate ?? "");
  const fileInput = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    if (!guestId) return;
    const res = await fetch(
      `/api/guest/${code}/media?guestId=${encodeURIComponent(guestId)}`,
    );
    if (res.ok) {
      const data = (await res.json()) as { items: MediaItem[] };
      setItems(data.items);
      setSelected((prev) =>
        prev ? (data.items.find((i) => i.id === prev.id) ?? null) : null,
      );
    }
  }, [code, guestId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (guestId && !localStorage.getItem("mv_guest_name_asked")) {
      setAskName(true);
    }
  }, [guestId]);

  function selectFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setPendingFiles(Array.from(files));
  }

  function cancelUpload() {
    setPendingFiles(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function confirmUpload() {
    const list = pendingFiles;
    if (!list || list.length === 0) return;
    // Si el invitado elige una fecha, se aplica a todo el lote (lo normal es
    // subir varias fotos del mismo momento a la vez). Si la deja en blanco,
    // se usa la fecha del propio archivo como respaldo.
    const overrideTakenAt = pendingDate ? new Date(`${pendingDate}T12:00:00`).getTime() : null;
    setPendingFiles(null);
    setUploading({ done: 0, total: list.length });
    for (const file of list) {
      const takenAt = overrideTakenAt ?? file.lastModified;
      try {
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/blob-upload",
          clientPayload: JSON.stringify({
            code,
            uploaderName: guestName || null,
            uploaderId: guestId || null,
            takenAt,
          }),
        });
        await fetch(`/api/guest/${code}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: blob.url,
            pathname: blob.pathname,
            contentType: blob.contentType || file.type,
            uploaderName: guestName || null,
            uploaderId: guestId || null,
            takenAt,
          }),
        });
      } catch (err) {
        console.error("Error subiendo", file.name, err);
        const detail = err instanceof Error ? err.message : String(err);
        alert(`No se pudo subir «${file.name}»: ${detail}`);
      }
      setUploading((u) => (u ? { ...u, done: u.done + 1 } : u));
    }
    setUploading(null);
    if (fileInput.current) fileInput.current.value = "";
    await refresh();
  }

  async function toggleReaction(item: MediaItem, emoji: string) {
    // Actualización optimista para que se sienta instantáneo.
    const had = item.myReactions.includes(emoji);
    const patch = (it: MediaItem): MediaItem =>
      it.id !== item.id
        ? it
        : {
            ...it,
            myReactions: had
              ? it.myReactions.filter((e) => e !== emoji)
              : [...it.myReactions, emoji],
            reactions: {
              ...it.reactions,
              [emoji]: Math.max(0, (it.reactions[emoji] ?? 0) + (had ? -1 : 1)),
            },
          };
    setItems((prev) => (prev ? prev.map(patch) : prev));
    setSelected((prev) => (prev ? patch(prev) : prev));
    await fetch(`/api/media/${item.id}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ guestId, emoji }),
    });
  }

  async function deleteOwn(item: MediaItem) {
    if (!confirm("¿Borrar esta foto que subiste?")) return;
    setItems((prev) => (prev ? prev.filter((i) => i.id !== item.id) : prev));
    setSelected(null);
    await fetch(`/api/media/${item.id}?guestId=${encodeURIComponent(guestId)}`, {
      method: "DELETE",
    });
  }

  const grouped = (items ?? []).reduce<Map<string, MediaItem[]>>((map, it) => {
    const key = dayKey(itemDate(it));
    map.set(key, [...(map.get(key) ?? []), it]);
    return map;
  }, new Map());
  const dayKeys = [...grouped.keys()].sort().reverse();

  return (
    <main className="mx-auto max-w-4xl px-4 pb-28 pt-6">
      <header className="text-center">
        <p className="flex items-center justify-center gap-1.5 text-sm text-tinta/50">
          <Camera size={14} /> Memorias Vivas
        </p>
        <h1
          className="mt-1 text-3xl font-semibold sm:text-4xl"
          style={{ fontFamily: "var(--font-display)" }}
        >
          {name}
        </h1>
        {eventDate && (
          <p className="mt-1 text-tinta/60">
            {new Date(eventDate + "T00:00:00").toLocaleDateString("es-ES", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        )}
      </header>

      <div className="mt-5 flex items-center justify-center gap-2">
        <button
          onClick={() => setView("galeria")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            view === "galeria" ? "bg-tinta text-white shadow-soft" : "bg-arena text-tinta/70"
          }`}
        >
          <LayoutGrid size={15} /> Galería
        </button>
        <button
          onClick={() => setView("dias")}
          className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
            view === "dias" ? "bg-tinta text-white shadow-soft" : "bg-arena text-tinta/70"
          }`}
        >
          <CalendarDays size={15} /> Por días
        </button>
      </div>

      {items === null ? (
        <p className="mt-12 text-center text-tinta/50">Cargando recuerdos…</p>
      ) : items.length === 0 ? (
        <div className="mt-12 flex flex-col items-center gap-2 text-center text-tinta/60">
          <Sprout size={36} className="text-teja/60" />
          <p>
            Este álbum está esperando su primer recuerdo.
            <br />
            ¡Sube tú la primera foto!
          </p>
        </div>
      ) : view === "galeria" ? (
        <ul className="mt-6 columns-2 gap-1.5 sm:columns-3 sm:gap-2">
          {items.map((item) => (
            <Thumb
              key={item.id}
              item={item}
              mine={!!guestId && item.uploaderId === guestId}
              onClick={() => setSelected(item)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6 space-y-8">
          {dayKeys.map((key) => (
            <section key={key}>
              <h2 className="text-sm font-semibold capitalize text-tinta/70">
                {dayLabel(key)}{" "}
                <span className="font-normal text-tinta/40">
                  · {grouped.get(key)!.length}
                </span>
              </h2>
              <ul className="mt-2 columns-2 gap-1.5 sm:columns-3 sm:gap-2">
                {grouped.get(key)!.map((item) => (
                  <Thumb
                    key={item.id}
                    item={item}
                    mine={!!guestId && item.uploaderId === guestId}
                    onClick={() => setSelected(item)}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      {/* Botón flotante de subida */}
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center bg-gradient-to-t from-crema via-crema/90 to-transparent px-4 pb-5 pt-8">
        <input
          ref={fileInput}
          type="file"
          accept="image/*,video/*"
          multiple
          hidden
          onChange={(e) => selectFiles(e.target.files)}
        />
        <button
          disabled={!!uploading}
          onClick={() => fileInput.current?.click()}
          className="shimmer flex items-center gap-2 rounded-full bg-teja px-8 py-3.5 text-lg font-semibold text-white shadow-lift transition hover:bg-teja-oscuro disabled:opacity-70"
        >
          {uploading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Subiendo {Math.min(uploading.done + 1, uploading.total)} de {uploading.total}…
            </>
          ) : (
            <>
              <Camera size={18} /> Subir fotos o vídeos
            </>
          )}
        </button>
      </div>

      {/* Confirmación antes de subir: permite corregir la fecha, para que el
          Dotbook y la vista por días queden bien organizados aunque el
          archivo no traiga la fecha real (frecuente en fotos reenviadas por
          WhatsApp). */}
      {pendingFiles && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="glass animate-fade-in w-full max-w-sm rounded-2xl p-6">
            <h2 className="flex items-center gap-2 text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              <Upload size={18} className="text-teja" />
              {pendingFiles.length} {pendingFiles.length === 1 ? "archivo" : "archivos"}
            </h2>
            <label className="mt-4 block text-sm font-semibold text-tinta/70">
              ¿De qué día son estas fotos?
            </label>
            <p className="mt-0.5 text-xs text-tinta/50">
              Opcional, pero ayuda a que se organicen bien en la galería y en el Dotbook.
            </p>
            <input
              type="date"
              value={pendingDate}
              onChange={(e) => setPendingDate(e.target.value)}
              className="mt-2 w-full rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
            />
            <div className="mt-4 flex gap-2">
              <button
                onClick={cancelUpload}
                className="flex-1 rounded-lg border border-tinta/15 bg-white/70 py-2.5 font-semibold text-tinta/70 transition hover:bg-white"
              >
                Cancelar
              </button>
              <button
                onClick={confirmUpload}
                className="shimmer flex-1 rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
              >
                Subir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Diálogo para pedir el nombre (opcional, una sola vez) */}
      {askName && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="glass animate-fade-in w-full max-w-sm rounded-2xl p-6">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              ¡Hola! 👋
            </h2>
            <p className="mt-1 text-sm text-tinta/60">
              ¿Cómo te llamas? Así los demás sabrán quién compartió cada foto.
              Puedes dejarlo en blanco si lo prefieres.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                localStorage.setItem("mv_guest_name_asked", "1");
                setAskName(false);
              }}
            >
              <input
                autoFocus
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                placeholder="Tu nombre"
                maxLength={100}
                className="mt-4 w-full rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
              />
              <button
                type="submit"
                className="shimmer mt-3 w-full rounded-lg bg-teja py-2.5 font-semibold text-white shadow-soft transition hover:bg-teja-oscuro"
              >
                Continuar
              </button>
            </form>
          </div>
        </div>
      )}

      {selected && (
        <Lightbox
          item={selected}
          guestId={guestId}
          guestName={guestName}
          onClose={() => setSelected(null)}
          onReact={(emoji) => toggleReaction(selected, emoji)}
          onDelete={() => deleteOwn(selected)}
          onCommentAdded={refresh}
        />
      )}
    </main>
  );
}

function Thumb({
  item,
  mine,
  onClick,
}: {
  item: MediaItem;
  mine: boolean;
  onClick: () => void;
}) {
  const reactionTotal = Object.values(item.reactions).reduce((a, b) => a + b, 0);
  const pending = !item.approved;
  return (
    <li className="mb-1.5 break-inside-avoid sm:mb-2">
      <button
        onClick={onClick}
        className={`card-interactive relative block w-full overflow-hidden rounded-xl bg-arena shadow-soft ${
          pending ? "opacity-60" : ""
        }`}
      >
        {item.type === "video" ? (
          <>
            <video
              src={item.url}
              className="block w-full"
              preload="metadata"
              muted
              playsInline
            />
            <span className="absolute right-1.5 top-1.5 rounded-full bg-black/50 p-1 text-white">
              <Play size={11} fill="white" />
            </span>
          </>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.url} alt="" loading="lazy" className="block w-full" />
        )}
        {pending && (
          <span className="absolute left-1.5 top-1.5 flex items-center gap-1 rounded-full bg-tinta/80 px-2 py-0.5 text-[10px] font-semibold text-white">
            <Hourglass size={10} /> Pendiente
          </span>
        )}
        {mine && !pending && (
          <span className="absolute left-1.5 top-1.5 rounded-full bg-teja/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            Tuya
          </span>
        )}
        {(reactionTotal > 0 || item.commentCount > 0) && (
          <span className="absolute bottom-1 left-1.5 flex items-center gap-1.5 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
            {reactionTotal > 0 && <span>❤️ {reactionTotal}</span>}
            {item.commentCount > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageCircle size={11} /> {item.commentCount}
              </span>
            )}
          </span>
        )}
      </button>
    </li>
  );
}

function Lightbox({
  item,
  guestId,
  guestName,
  onClose,
  onReact,
  onDelete,
  onCommentAdded,
}: {
  item: MediaItem;
  guestId: string;
  guestName: string;
  onClose: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onCommentAdded: () => void;
}) {
  const [commentList, setCommentList] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const mine = !!guestId && item.uploaderId === guestId;

  useEffect(() => {
    fetch(`/api/media/${item.id}/comments`)
      .then((r) => r.json())
      .then((data: { items: Comment[] }) => setCommentList(data.items))
      .catch(() => setCommentList([]));
  }, [item.id]);

  async function sendComment(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/media/${item.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorName: guestName || null, body: text }),
      });
      if (res.ok) {
        const data = (await res.json()) as { item: Comment };
        setCommentList((prev) => [...(prev ?? []), data.item]);
        setDraft("");
        onCommentAdded();
      }
    } finally {
      setSending(false);
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-30 flex flex-col bg-black/90"
      onClick={onClose}
    >
      <div className="flex items-center justify-between p-3 text-white">
        <span className="flex items-center gap-2 text-sm opacity-80">
          {item.uploaderName ? `Subida por ${item.uploaderName}` : "Anónimo"}
          {!item.approved && (
            <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
              <Hourglass size={11} /> Pendiente de aprobación
            </span>
          )}
        </span>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {mine && (
            <button
              onClick={onDelete}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm transition hover:bg-red-500/80"
            >
              <Trash2 size={14} /> Borrar
            </button>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm transition hover:bg-white/25"
          >
            <X size={14} /> Cerrar
          </button>
        </div>
      </div>

      <div
        className="flex min-h-0 flex-1 items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
      >
        {item.type === "video" ? (
          <video
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={item.url}
            alt=""
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        )}
      </div>

      <div
        className="glass max-h-[45%] overflow-y-auto rounded-t-2xl p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center gap-2">
          {EMOJIS.map((emoji) => {
            const count = item.reactions[emoji] ?? 0;
            const mineReacted = item.myReactions.includes(emoji);
            return (
              <button
                key={emoji}
                onClick={() => onReact(emoji)}
                disabled={!guestId}
                className={`rounded-full border px-3.5 py-1.5 text-lg transition ${
                  mineReacted
                    ? "border-teja bg-teja/10 shadow-soft"
                    : "border-tinta/15 bg-white/70 hover:bg-white"
                }`}
              >
                {emoji}
                {count > 0 && (
                  <span className="ml-1 text-sm text-tinta/60">{count}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {commentList === null ? (
            <p className="text-center text-sm text-tinta/40">
              Cargando comentarios…
            </p>
          ) : commentList.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-sm text-tinta/40">
              <MessageCircle size={14} /> Sé el primero en comentar
            </p>
          ) : (
            <ul className="space-y-2">
              {commentList.map((c) => (
                <li key={c.id} className="rounded-lg bg-white/70 px-3 py-2 text-sm">
                  <span className="font-semibold">
                    {c.authorName || "Anónimo"}:
                  </span>{" "}
                  {c.body}
                </li>
              ))}
            </ul>
          )}
          <form onSubmit={sendComment} className="mt-3 flex gap-2">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribe un comentario…"
              maxLength={1000}
              className="flex-1 rounded-lg border border-tinta/20 bg-white/80 px-3 py-2 text-sm outline-none transition focus:border-teja focus:ring-2 focus:ring-teja/20"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="shimmer rounded-lg bg-teja px-4 py-2 text-sm font-semibold text-white shadow-soft transition hover:bg-teja-oscuro disabled:opacity-50"
            >
              Enviar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
