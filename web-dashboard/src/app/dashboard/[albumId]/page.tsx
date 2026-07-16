'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { E2eeKeyPanel } from '@/components/E2eeKeyPanel';
import { EncryptedMedia } from '@/components/EncryptedMedia';
import { loadAlbumKey } from '@/lib/e2ee-key-storage';
import { useTrpc } from '@/lib/trpc-hooks';

const STAT_LABELS = {
  totalPhotos: 'Fotos',
  totalVideos: 'Vídeos',
  totalMessages: 'Mensajes',
  uniqueContributors: 'Colaboradores',
} as const;

export default function AlbumDetailPage() {
  const { albumId } = useParams<{ albumId: string }>();
  const trpc = useTrpc();
  const queryClient = useQueryClient();

  const albumQuery = useQuery({
    queryKey: ['album', albumId, 'get'],
    queryFn: () => trpc.album.getById.query({ albumId }),
  });

  const statsQuery = useQuery({
    queryKey: ['album', albumId, 'stats'],
    queryFn: () => trpc.album.stats.query({ albumId }),
  });

  const mediaQuery = useQuery({
    queryKey: ['media', albumId, 'list'],
    queryFn: () => trpc.media.listByAlbum.query({ albumId }),
  });

  const removeMedia = useMutation({
    mutationFn: (mediaId: string) => trpc.media.remove.mutate({ mediaId }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['media', albumId, 'list'] }),
  });

  const isE2ee = albumQuery.data?.isE2ee ?? false;
  const localKey = isE2ee ? loadAlbumKey(albumId) : null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="mb-6 text-2xl font-semibold">
        {isE2ee && '🔒 '}
        {albumQuery.data?.title ?? 'Estadísticas y moderación'}
      </h1>

      {isE2ee && <E2eeKeyPanel albumId={albumId} />}

      {statsQuery.data && (
        <dl className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(Object.keys(STAT_LABELS) as Array<keyof typeof STAT_LABELS>).map((key) => (
            <div
              key={key}
              className="rounded-2xl border border-amber-100 bg-white/60 p-4 text-center dark:bg-ink/40"
            >
              <dt className="text-sm text-ink/60 dark:text-cream/60">{STAT_LABELS[key]}</dt>
              <dd className="text-2xl font-semibold">{statsQuery.data[key]}</dd>
            </div>
          ))}
        </dl>
      )}

      <h2 className="mb-4 text-lg font-semibold">Contenido subido</h2>
      {mediaQuery.data?.length === 0 && (
        <p className="text-ink/60 dark:text-cream/60">Todavía no hay contenido en este álbum.</p>
      )}
      <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {mediaQuery.data?.map((item) => (
          <li key={item.id} className="group relative overflow-hidden rounded-xl border border-amber-100">
            {isE2ee ? (
              localKey ? (
                <EncryptedMedia url={item.url} exportedKey={localKey} type={item.type} alt={item.description ?? ''} />
              ) : (
                <div className="flex aspect-square items-center justify-center bg-amber-50 p-2 text-center text-xs text-ink/60 dark:bg-amber-950/30 dark:text-cream/60">
                  Sin clave en este dispositivo
                </div>
              )
            ) : item.type === 'IMAGE' ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.url} alt={item.description ?? ''} className="aspect-square w-full object-cover" />
            ) : (
              <video src={item.url} className="aspect-square w-full object-cover" muted />
            )}
            <button
              type="button"
              onClick={() => removeMedia.mutate(item.id)}
              disabled={removeMedia.isPending}
              className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
