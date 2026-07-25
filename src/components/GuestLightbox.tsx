"use client";

import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  Hourglass,
  Loader2,
  MessageCircle,
  Send,
  Trash2,
  X,
} from "lucide-react";
import {
  EMOJIS,
  type Comment,
  type MediaItem,
  avatarColor,
  downloadMedia,
  initial,
  timeAgo,
} from "@/lib/guest-types";

// Distancia mínima de arrastre para contar como "pasar de foto" (en px).
const SWIPE_THRESHOLD = 60;

export function GuestLightbox({
  item,
  index,
  total,
  guestId,
  guestName,
  challengeLabel,
  onClose,
  onPrev,
  onNext,
  onReact,
  onDelete,
  onCommentAdded,
}: {
  item: MediaItem;
  index: number;
  total: number;
  guestId: string;
  guestName: string;
  challengeLabel: string | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onReact: (emoji: string) => void;
  onDelete: () => void;
  onCommentAdded: () => void;
}) {
  const [commentList, setCommentList] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const mine = !!guestId && item.uploaderId === guestId;

  useEffect(() => {
    setCommentList(null);
    fetch(`/api/media/${item.id}/comments`)
      .then((r) => r.json())
      .then((data: { items: Comment[] }) => setCommentList(data.items))
      .catch(() => setCommentList([]));
  }, [item.id]);

  // Teclado: flechas para pasar de foto y Escape para salir. En un portátil o
  // una tablet con teclado es lo que uno espera de un visor de fotos.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA)$/.test(target.tagName)) return;
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") onPrev();
      else if (e.key === "ArrowRight") onNext();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, onPrev, onNext]);

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

  async function download() {
    setDownloading(true);
    const ext = item.type === "video" ? "mp4" : "jpg";
    try {
      await downloadMedia(item.url, `memorias-vivas-${item.id.slice(0, 8)}.${ext}`);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div
      className="animate-fade-in fixed inset-0 z-30 flex flex-col bg-black/95 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="flex items-center justify-between gap-2 p-3 text-white">
        <div className="flex min-w-0 items-center gap-2">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ backgroundColor: avatarColor(item.uploaderName) }}
          >
            {initial(item.uploaderName)}
          </span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-semibold">
              {item.uploaderName || "Invitado anónimo"}
            </span>
            <span className="block truncate text-xs opacity-60">
              {timeAgo(item.takenAt ?? item.createdAt)}
              {challengeLabel ? ` · ${challengeLabel}` : ""}
            </span>
          </span>
          {!item.approved && (
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-xs">
              <Hourglass size={11} /> Pendiente
            </span>
          )}
        </div>
        <div
          className="flex shrink-0 items-center gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="px-1 text-xs whitespace-nowrap opacity-60">
            {index + 1} / {total}
          </span>
          <button
            onClick={download}
            disabled={downloading}
            title="Guardar en mi móvil"
            className="btn btn-on-dark px-3 py-1.5 text-sm"
          >
            {downloading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            <span className="hidden sm:inline">Guardar</span>
          </button>
          {mine && (
            <button
              onClick={onDelete}
              title="Borrar mi foto"
              className="btn btn-on-dark px-3 py-1.5 text-sm hover:bg-red-500/80"
            >
              <Trash2 size={14} />
            </button>
          )}
          <button
            onClick={onClose}
            title="Cerrar"
            className="btn btn-on-dark px-3 py-1.5 text-sm"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div
        className="relative flex min-h-0 flex-1 items-center justify-center px-2"
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start === null) return;
          const delta = e.changedTouches[0].clientX - start;
          if (delta > SWIPE_THRESHOLD) onPrev();
          else if (delta < -SWIPE_THRESHOLD) onNext();
        }}
      >
        {item.type === "video" ? (
          <video
            key={item.id}
            src={item.url}
            controls
            autoPlay
            playsInline
            className="max-h-full max-w-full rounded-lg"
          />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={item.id}
            src={item.url}
            alt=""
            className="animate-crossfade max-h-full max-w-full rounded-lg object-contain"
          />
        )}

        {total > 1 && (
          <>
            <button
              onClick={onPrev}
              title="Anterior"
              className="absolute left-1 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30"
            >
              <ChevronLeft size={22} />
            </button>
            <button
              onClick={onNext}
              title="Siguiente"
              className="absolute right-1 top-1/2 -translate-y-1/2 rounded-full bg-white/15 p-2.5 text-white backdrop-blur-sm transition hover:bg-white/30"
            >
              <ChevronRight size={22} />
            </button>
          </>
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
                className={`rounded-full border px-3.5 py-1.5 text-lg transition active:scale-95 ${
                  mineReacted
                    ? "border-teja bg-teja/10 shadow-soft"
                    : "border-tinta/15 bg-white/70 hover:bg-white"
                }`}
              >
                {emoji}
                {count > 0 && <span className="ml-1 text-sm text-tinta/60">{count}</span>}
              </button>
            );
          })}
        </div>

        <div className="mt-4">
          {commentList === null ? (
            <div className="space-y-2">
              <div className="skeleton h-10 rounded-xl" />
              <div className="skeleton h-10 w-2/3 rounded-xl" />
            </div>
          ) : commentList.length === 0 ? (
            <p className="flex items-center justify-center gap-1.5 text-center text-sm text-tinta/40">
              <MessageCircle size={14} /> Sé el primero en comentar
            </p>
          ) : (
            <ul className="space-y-2">
              {commentList.map((c) => (
                <li key={c.id} className="flex items-start gap-2">
                  <span
                    className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: avatarColor(c.authorName) }}
                  >
                    {initial(c.authorName)}
                  </span>
                  <div className="min-w-0 flex-1 rounded-2xl rounded-tl-sm bg-white/80 px-3 py-2 text-sm">
                    <p className="flex items-baseline justify-between gap-2">
                      <span className="truncate font-semibold">
                        {c.authorName || "Anónimo"}
                      </span>
                      <span className="shrink-0 text-xs text-tinta/40">
                        {timeAgo(c.createdAt)}
                      </span>
                    </p>
                    <p className="mt-0.5 break-words">{c.body}</p>
                  </div>
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
              className="field flex-1 text-sm"
            />
            <button
              type="submit"
              disabled={sending || !draft.trim()}
              className="btn btn-primary shimmer px-4 py-2 text-sm"
            >
              {sending ? (
                <Loader2 size={15} className="animate-spin" />
              ) : (
                <Send size={15} />
              )}
              <span className="hidden sm:inline">Enviar</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
