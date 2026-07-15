'use client';

import { UserButton } from '@clerk/nextjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';
import { useTrpc } from '@/lib/trpc-hooks';

export default function DashboardPage() {
  const trpc = useTrpc();
  const queryClient = useQueryClient();

  const albumsQuery = useQuery({
    queryKey: ['albums', 'listMine'],
    queryFn: () => trpc.album.listMine.query(),
  });

  const [title, setTitle] = useState('');
  const [eventDate, setEventDate] = useState('');

  const createAlbum = useMutation({
    mutationFn: () => trpc.album.create.mutate({ title, eventDate: new Date(eventDate) }),
    onSuccess: () => {
      setTitle('');
      setEventDate('');
      void queryClient.invalidateQueries({ queryKey: ['albums', 'listMine'] });
    },
  });

  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tus álbumes</h1>
        <UserButton afterSignOutUrl="/" />
      </header>

      <form
        className="mb-10 flex flex-wrap items-end gap-3 rounded-2xl border border-amber-100 bg-white/60 p-4 dark:bg-ink/40"
        onSubmit={(event) => {
          event.preventDefault();
          if (title && eventDate) createAlbum.mutate();
        }}
      >
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="title">
            Título
          </label>
          <input
            id="title"
            className="rounded-lg border border-amber-200 bg-transparent px-3 py-2"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm" htmlFor="eventDate">
            Fecha
          </label>
          <input
            id="eventDate"
            type="date"
            className="rounded-lg border border-amber-200 bg-transparent px-3 py-2"
            value={eventDate}
            onChange={(event) => setEventDate(event.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          disabled={createAlbum.isPending}
          className="rounded-full bg-amber-500 px-5 py-2 font-medium text-white hover:bg-amber-600 disabled:opacity-50"
        >
          {createAlbum.isPending ? 'Creando…' : 'Crear álbum'}
        </button>
      </form>

      {albumsQuery.isLoading && <p>Cargando…</p>}
      {albumsQuery.error && <p className="text-red-600">No se pudieron cargar los álbumes.</p>}

      <ul className="grid gap-4 sm:grid-cols-2">
        {albumsQuery.data?.map((album) => (
          <li key={album.id}>
            <Link
              href={`/dashboard/${album.id}`}
              className="block rounded-2xl border border-amber-100 bg-white/60 p-4 transition hover:border-amber-400 dark:bg-ink/40"
            >
              <p className="font-medium">{album.title}</p>
              <p className="text-sm text-ink/60 dark:text-cream/60">
                {new Date(album.eventDate).toLocaleDateString('es-ES')}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
