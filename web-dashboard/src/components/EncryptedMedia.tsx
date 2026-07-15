'use client';

import { useEffect, useState } from 'react';
import { decryptBlob, importKey } from '@/lib/e2ee';

interface EncryptedMediaProps {
  url: string;
  exportedKey: string;
  type: 'IMAGE' | 'VIDEO';
  alt?: string;
}

// Descarga el blob cifrado y lo descifra en memoria para poder renderizarlo
// — el servidor nunca ve el contenido en claro, solo este navegador con la
// clave importada localmente.
export function EncryptedMedia({ url, exportedKey, type, alt }: EncryptedMediaProps) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    async function run() {
      try {
        const key = await importKey(exportedKey);
        const response = await fetch(url);
        const encrypted = await response.blob();
        const mimeType = type === 'IMAGE' ? 'image/jpeg' : 'video/mp4';
        const decrypted = await decryptBlob(encrypted, key, mimeType);
        if (cancelled) return;
        createdUrl = URL.createObjectURL(decrypted);
        setObjectUrl(createdUrl);
      } catch {
        if (!cancelled) setError(true);
      }
    }

    void run();

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [url, exportedKey, type]);

  if (error) {
    return (
      <div className="flex aspect-square items-center justify-center bg-red-50 text-center text-xs text-red-600">
        Error al descifrar (¿clave incorrecta?)
      </div>
    );
  }

  if (!objectUrl) {
    return <div className="aspect-square animate-pulse bg-amber-100 dark:bg-amber-950/40" />;
  }

  return type === 'IMAGE' ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={objectUrl} alt={alt ?? ''} className="aspect-square w-full object-cover" />
  ) : (
    <video src={objectUrl} className="aspect-square w-full object-cover" muted controls />
  );
}
