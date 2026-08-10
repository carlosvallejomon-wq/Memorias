"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Check, X, Loader2 } from "lucide-react";
import {
  approveMedia,
  deleteAlbum,
  deleteComment,
  deleteGuestbookEntry,
  deleteMedia,
} from "@/app/dashboard/actions";

export function DeleteAlbumButton({
  albumId,
  albumName,
}: {
  albumId: string;
  albumName: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // La navegación la hace el navegador cuando la acción ha terminado, en vez
  // de que la acción redirija: así el resultado (o el fallo) llega hasta aquí
  // y se puede enseñar.
  function borrar() {
    if (
      !confirm(
        `¿Seguro que quieres borrar el álbum «${albumName}» y todo su contenido? Esta acción no se puede deshacer.`,
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        const r = await deleteAlbum(albumId);
        if (r.ok) {
          router.push("/dashboard");
          router.refresh();
        } else {
          setError(r.error ?? "No se pudo borrar el álbum.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar el álbum.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
    <button
      disabled={pending}
      onClick={borrar}
      className="flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 shadow-soft transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
      Borrar álbum
    </button>
    {error && (
      <p className="nota max-w-sm rounded-xl px-3 py-2 text-xs" role="alert">
        {error}
      </p>
    )}
    </div>
  );
}

export function DeleteMediaButton({ mediaId }: { mediaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este recuerdo del álbum?")) {
          startTransition(() => deleteMedia(mediaId));
        }
      }}
      title="Borrar"
      className="rounded-full bg-black/50 p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

export function DeleteGuestbookEntryButton({ entryId }: { entryId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este mensaje del muro?")) {
          startTransition(() => deleteGuestbookEntry(entryId));
        }
      }}
      title="Borrar mensaje"
      className="shrink-0 rounded-full p-1.5 text-tinta/30 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

export function DeleteCommentButton({ commentId }: { commentId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Borrar este comentario?")) {
          startTransition(() => deleteComment(commentId));
        }
      }}
      title="Borrar comentario"
      className="shrink-0 rounded-full p-1.5 text-tinta/30 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
    </button>
  );
}

export function ApproveMediaButton({ mediaId }: { mediaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => startTransition(() => approveMedia(mediaId))}
      title="Aprobar y publicar"
      className="flex items-center gap-1 rounded-full bg-teja px-3 py-1.5 text-xs font-semibold text-white shadow-soft transition hover:bg-teja-oscuro disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
      Aprobar
    </button>
  );
}

export function RejectMediaButton({ mediaId }: { mediaId: string }) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("¿Rechazar y borrar esta foto?")) {
          startTransition(() => deleteMedia(mediaId));
        }
      }}
      title="Rechazar"
      className="flex items-center gap-1 rounded-full border border-tinta/15 bg-white px-3 py-1.5 text-xs font-semibold text-tinta/70 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
      Rechazar
    </button>
  );
}
