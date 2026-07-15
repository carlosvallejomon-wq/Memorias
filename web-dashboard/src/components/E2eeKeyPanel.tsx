'use client';

import { useEffect, useState } from 'react';
import { loadAlbumKey, saveAlbumKey } from '@/lib/e2ee-key-storage';

export function E2eeKeyPanel({ albumId }: { albumId: string }) {
  const [key, setKey] = useState<string | null>(null);
  const [importValue, setImportValue] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setKey(loadAlbumKey(albumId));
  }, [albumId]);

  const handleImport = () => {
    const trimmed = importValue.trim();
    if (!trimmed) return;
    saveAlbumKey(albumId, trimmed);
    setKey(trimmed);
    setImportValue('');
  };

  return (
    <div className="mb-8 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm dark:bg-amber-950/30">
      <p className="mb-2 font-medium">🔒 Álbum con cifrado de extremo a extremo</p>
      {key ? (
        <>
          <p className="mb-2 text-ink/70 dark:text-cream/70">
            Guarda esta clave en un lugar seguro. Sin ella, el contenido de este álbum es irrecuperable — ni
            siquiera nosotros podemos descifrarlo.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-x-auto rounded-lg bg-white/70 px-3 py-2 dark:bg-black/30">{key}</code>
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(key);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="rounded-full bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </>
      ) : (
        <>
          <p className="mb-2 text-ink/70 dark:text-cream/70">
            No tienes la clave de este álbum en este dispositivo. Si la tienes guardada, pégala aquí para poder
            ver el contenido.
          </p>
          <div className="flex items-center gap-2">
            <input
              className="flex-1 rounded-lg border border-amber-200 bg-transparent px-3 py-2"
              value={importValue}
              onChange={(event) => setImportValue(event.target.value)}
              placeholder="Clave exportada"
            />
            <button
              type="button"
              onClick={handleImport}
              className="rounded-full bg-amber-500 px-3 py-1 text-white hover:bg-amber-600"
            >
              Importar
            </button>
          </div>
        </>
      )}
    </div>
  );
}
