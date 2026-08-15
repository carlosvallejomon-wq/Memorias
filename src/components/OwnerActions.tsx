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
  //
  // Y la vuelta al panel es una recarga de verdad, no `router.push`: el router
  // de Next guarda en memoria la última versión de /dashboard y volvía a
  // pintarla con el álbum recién borrado todavía en la lista. `router.refresh`
  // la corrige un instante después, pero por medio se ve el álbum ahí y parece
  // que no se ha borrado — que es justo lo que había que quitar.
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
          router.replace("/dashboard");
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

/**
 * Borrar un recuerdo.
 *
 * El refresco lo pide el navegador cuando la acción ya ha terminado. Antes lo
 * hacía la propia acción con `revalidatePath`, y eso significaba volver a
 * dibujar la página entera del álbum como parte de la respuesta: el botón se
 * quedaba girando hasta que terminaba todo, y muchas veces no llegaba a
 * terminar. Así se ve el resultado en cuanto la foto está borrada.
 */
export function DeleteMediaButton({ mediaId }: { mediaId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function borrar() {
    if (!confirm("¿Borrar este recuerdo del álbum?")) return;
    setError(null);
    startTransition(async () => {
      try {
        const r = await deleteMedia(mediaId);
        if (r.ok) router.refresh();
        else setError(r.error ?? "No se pudo borrar.");
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo borrar.");
      }
    });
  }

  return (
    <button
      disabled={pending}
      onClick={borrar}
      title={error ?? "Borrar"}
      className={`rounded-full p-1.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 disabled:opacity-50 ${
        error ? "bg-red-600 opacity-100" : "bg-black/50"
      }`}
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
        if (confirm("¿Borrar esta dedicatoria?")) {
          startTransition(() => deleteGuestbookEntry(entryId));
        }
      }}
      title="Borrar dedicatoria"
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
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (!confirm("¿Rechazar y borrar esta foto?")) return;
        startTransition(async () => {
          await deleteMedia(mediaId);
          router.refresh();
        });
      }}
      title="Rechazar"
      className="flex items-center gap-1 rounded-full border border-tinta/15 bg-white px-3 py-1.5 text-xs font-semibold text-tinta/70 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
    >
      {pending ? <Loader2 size={14} className="animate-spin" /> : <X size={14} />}
      Rechazar
    </button>
  );
}
