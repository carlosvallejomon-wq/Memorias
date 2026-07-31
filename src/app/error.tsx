"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RotateCw } from "lucide-react";

// Cuando algo falla, esto sustituye a la pantalla en blanco. Además deja el
// error en la consola del servidor, que es donde se puede consultar después.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fallo en la página:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arena text-teja">
        <AlertTriangle size={26} />
      </span>
      <h1
        className="mt-4 text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Algo se ha torcido
      </h1>
      <p className="mt-2 text-tinta/60">
        No hemos podido cargar esta página. Suele arreglarse volviendo a
        intentarlo; tus fotos están a salvo.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <button onClick={reset} className="btn btn-primary">
          <RotateCw size={16} /> Volver a intentarlo
        </button>
        <Link href="/" className="btn btn-soft">
          Ir a la portada
        </Link>
      </div>
      {error.digest && (
        <p className="mt-6 font-mono text-xs text-tinta/30">Referencia: {error.digest}</p>
      )}
    </main>
  );
}
