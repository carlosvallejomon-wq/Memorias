import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-arena text-teja">
        <Compass size={26} />
      </span>
      <h1
        className="mt-4 text-2xl font-semibold"
        style={{ fontFamily: "var(--font-display)" }}
      >
        Esta página no existe
      </h1>
      <p className="mt-2 text-tinta/60">
        Puede que el enlace esté mal copiado. Si buscabas un álbum, pídele al
        organizador que te vuelva a mandar el enlace o el código QR.
      </p>
      <Link href="/" className="btn btn-primary mt-5">
        Ir a la portada
      </Link>
    </main>
  );
}
