"use client";

import { useTransition } from "react";
import { deleteAlbum, deleteMedia } from "@/app/dashboard/actions";

export function DeleteAlbumButton({
  albumId,
  albumName,
}: {
  albumId: string;
  albumName: string;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      disabled={pending}
      onClick={() => {
        if (
          confirm(
            `¿Seguro que quieres borrar el álbum «${albumName}» y todo su contenido? Esta acción no se puede deshacer.`,
          )
        ) {
          startTransition(() => deleteAlbum(albumId));
        }
      }}
      className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
    >
      {pending ? "Borrando…" : "Borrar álbum"}
    </button>
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
      className="rounded-md bg-black/40 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100 disabled:opacity-50"
    >
      {pending ? "…" : "🗑"}
    </button>
  );
}
