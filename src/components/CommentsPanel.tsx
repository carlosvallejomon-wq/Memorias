import { MessageCircle } from "lucide-react";
import { DeleteCommentButton } from "@/components/OwnerActions";

export type CommentRow = {
  id: string;
  authorName: string | null;
  body: string;
  createdAt: Date;
  mediaUrl: string;
  mediaPosterUrl: string | null;
  mediaType: string;
};

// Comentarios de todo el álbum en un solo sitio, para que el organizador
// pueda retirar el que haga falta sin ir foto por foto.
export function CommentsPanel({ comments }: { comments: CommentRow[] }) {
  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-semibold">
        <MessageCircle size={18} className="text-teja" /> Comentarios
        <span className="font-normal text-tinta/40">({comments.length})</span>
      </h2>

      {comments.length === 0 ? (
        <p className="mt-3 text-sm text-tinta/50">
          Todavía nadie ha comentado ninguna foto. Cuando lo hagan aparecerán
          aquí y podrás borrar el que quieras.
        </p>
      ) : (
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {comments.map((c) => (
            <li
              key={c.id}
              className="flex items-start gap-3 rounded-2xl border border-tinta/8 bg-white/70 p-3 shadow-soft"
            >
              <img
                src={c.mediaType === "video" ? (c.mediaPosterUrl ?? c.mediaUrl) : c.mediaUrl}
                alt=""
                loading="lazy"
                decoding="async"
                className="h-12 w-12 shrink-0 rounded-lg object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm break-words">{c.body}</p>
                <p className="mt-1 text-xs text-tinta/50">
                  <span className="font-semibold text-tinta/70">
                    {c.authorName || "Anónimo"}
                  </span>{" "}
                  ·{" "}
                  {c.createdAt.toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                  })}
                </p>
              </div>
              <DeleteCommentButton commentId={c.id} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
